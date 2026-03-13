package service

import (
	"context"
	"fmt"
	"time"
	"errors"

	catalogpb "delivery-proto/catalogpb"
	notificationpb "delivery-proto/notificationpb"
	orderpb "delivery-proto/orderpb"

	"order-service/internal/domain"
	"order-service/internal/email"
	catalogclient "order-service/internal/grpc"
	"order-service/internal/messaging"
	"order-service/internal/repository"
)

type OrderService struct {
	repo               *repository.OrderRepository
	catalogClient      *catalogclient.CatalogClient
	userClient         *catalogclient.UserClient
	notificationClient *catalogclient.NotificationClient
	publisher          *messaging.Publisher
}

func NewOrderService(
	r *repository.OrderRepository,
	catalogClient *catalogclient.CatalogClient,
	userClient *catalogclient.UserClient,
	notificationClient *catalogclient.NotificationClient,
	publisher *messaging.Publisher,
) *OrderService {
	return &OrderService{
		repo:               r,
		catalogClient:      catalogClient,
		userClient:         userClient,
		notificationClient: notificationClient,
		publisher:          publisher,
	}
}

// CreateOrder valida los productos, calcula el total, encola la orden
// y luego hace polling a la BD hasta que el consumer la persista.
// Retorna el ID real de la orden una vez confirmada en BD.
func (s *OrderService) CreateOrder(ctx context.Context, req *orderpb.CreateOrderRequest) (int, error) {
	if len(req.Items) == 0 {
		return 0, errors.New("la orden no tiene productos")
	}

	order := &domain.Order{
		ClienteId:         int32(req.ClientId),
		ClienteNombre:     req.ClientName,
		ClienteTelefono:   req.ClientPhone,
		DireccionEntrega:  req.Address,
		LatitudEntrega:    req.Lat,
		LongitudEntrega:   req.Lng,
		RestauranteId:     req.RestaurantId,
		RestauranteNombre: req.RestaurantName,
		CostoTotal:        0,
	}

	// Consultar catalog-service para validar y calcular el total
	productIDs := make([]int32, 0, len(req.Items))
	for _, item := range req.Items {
		productIDs = append(productIDs, item.ProductId)
	}

	catalogResp, err := s.catalogClient.GetProductsByIDs(productIDs)
	if err != nil {
		return 0, fmt.Errorf("error consultando catalog-service: %w", err)
	}

	productsMap := make(map[int32]*catalogpb.Product, len(catalogResp))
	for _, p := range catalogResp {
		productsMap[p.Id] = p
	}

	var total float64
	var restaurantID int32 = -1

	for _, item := range req.Items {
		product, exists := productsMap[item.ProductId]
		if !exists {
			return 0, fmt.Errorf("producto %d no existe", item.ProductId)
		}
		if !product.Disponible {
			return 0, fmt.Errorf("producto '%s' no está disponible", product.Nombre)
		}
		if restaurantID == -1 {
			restaurantID = product.RestaurantId
		} else if restaurantID != product.RestaurantId {
			return 0, errors.New("todos los productos deben ser del mismo restaurante")
		}

		total += product.Precio * float64(item.Quantity)
		order.Items = append(order.Items, domain.OrderItem{
			ProductoId:     item.ProductId,
			NombreProducto: product.Nombre,
			PrecioUnitario: product.Precio,
			Cantidad:       int32(item.Quantity),
			Comentarios:    item.Comments,
		})
	}
	
	total -= req.DiscountAmount
	order.CostoTotal = total

	// Publicar en la cola para que el consumer la persista
	if err := s.publisher.PublicarOrden(order); err != nil {
		return 0, fmt.Errorf("error encolando la orden: %w", err)
	}

	// Polling: esperar hasta que el consumer inserte la orden en BD
	// y devolver el ID real al cliente (máx 15 segundos, intentos cada 500ms)
	orderID, err := s.waitForOrderPersisted(ctx, req.ClientId)
	if err != nil {
		return 0, fmt.Errorf("orden encolada pero no confirmada a tiempo: %w", err)
	}

	return orderID, nil
}

// waitForOrderPersisted hace polling a la BD hasta encontrar la orden más
// reciente del cliente, confirmando que el consumer ya la persistió.
func (s *OrderService) waitForOrderPersisted(ctx context.Context, clientID int32) (int, error) {
	const (
		maxWait  = 15 * time.Second
		interval = 500 * time.Millisecond
	)

	deadline := time.Now().Add(maxWait)

	for time.Now().Before(deadline) {
		// Usar contexto con timeout corto para cada intento
		queryCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
		id, err := s.repo.GetLatestOrderIDByClient(queryCtx, clientID)
		cancel()

		if err == nil && id > 0 {
			return id, nil
		}

		// Si el contexto padre fue cancelado, salir inmediatamente
		if ctx.Err() != nil {
			return 0, ctx.Err()
		}

		time.Sleep(interval)
	}

	return 0, fmt.Errorf("timeout esperando confirmación de la orden (cliente %d)", clientID)
}

// ProcessOrder es llamado por el Consumer al desencolar un mensaje.
// Es el único punto donde la orden se persiste en la base de datos.
// Si retorna error, el consumer hace Nack y la orden vuelve a la cola.
func (s *OrderService) ProcessOrder(ctx context.Context, order *domain.Order) error {
	orderID, err := s.repo.CreateOrder(ctx, order)
	if err != nil {
		return fmt.Errorf("error persistiendo orden en BD: %w", err)
	}

	order.Id = orderID
	go s.sendOrderCreatedEmail(orderID)

	return nil
}

func (s *OrderService) GetOrdersByClient(ctx context.Context, clientID int) ([]domain.Order, error) {
	return s.repo.GetOrdersByClient(ctx, clientID)
}

func (s *OrderService) GetOrdersByRestaurant(ctx context.Context, restaurantID int) ([]domain.Order, error) {
	return s.repo.GetOrdersByRestaurant(ctx, restaurantID)
}

func (s *OrderService) AssignDriver(ctx context.Context, orderID int, driverID int) error {
	go s.notifyDriverAssigned(orderID, driverID)
	return s.repo.AssignDriver(ctx, orderID, driverID)
}

func (s *OrderService) notifyDriverAssigned(orderID int, driverID int) {
	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()

	order, err := s.repo.GetOrderByID(ctx, orderID)
	if err != nil {
		return
	}

	items, err := s.repo.GetOrderItems(ctx, orderID)
	if err != nil {
		return
	}

	driverResp, err := s.userClient.GetUser(int32(driverID))
	if err != nil {
		return
	}

	var protoItems []*notificationpb.AssignedProduct
	for _, it := range items {
		protoItems = append(protoItems, &notificationpb.AssignedProduct{
			Name:     it.NombreProducto,
			Quantity: int32(it.Cantidad),
		})
	}

	clientResp, err := s.userClient.GetUser(order.ClienteId)
	if err != nil {
		return
	}

	req := &notificationpb.DriverAssignedEmailRequest{
		ToEmail:        clientResp.User.Email,
		OrderId:        int32(orderID),
		DriverName:     driverResp.User.NombreCompleto,
		RestaurantName: order.RestauranteNombre,
		Products:       protoItems,
	}
	_ = s.notificationClient.SendDriverAssignedEmail(ctx, req)
}

func (s *OrderService) GetFinishedOrders(ctx context.Context) ([]domain.Order, error) {
	return s.repo.GetOrdersByStatus(ctx, "TERMINADA")
}

func (s *OrderService) GetDeliveredOrders(ctx context.Context) ([]domain.Order, error) {
	return s.repo.GetOrdersByStatus(ctx, "ENTREGADA")
}

func (s *OrderService) GetDriverOrders(ctx context.Context, driverID int) ([]domain.Order, error) {
	return s.repo.GetOrdersByDriver(ctx, driverID)
}

func (s *OrderService) sendOrderCreatedEmail(orderID int) {
	order, err := s.repo.GetOrderByID(context.Background(), orderID)
	if err != nil {
		fmt.Println("[Email] error obteniendo orden:", err)
		return
	}

	userRes, err := s.userClient.GetUser(order.ClienteId)
	if err != nil {
		fmt.Println("[Email] error obteniendo usuario:", err)
		return
	}

	productos := ""
	for _, p := range order.Items {
		productos += fmt.Sprintf("- %s x%d\n", p.NombreProducto, p.Cantidad)
	}

	emailData := email.OrderEmailData{
		ClienteNombre: userRes.User.NombreCompleto,
		OrderID:       order.Id,
		Productos:     productos,
		MontoTotal:    order.CostoTotal,
		FechaCreacion: time.Now().Format("02 Jan 2006 15:04"),
		Estado:        "CREADA",
	}

	subject, body := email.BuildOrderCreatedEmail(emailData)
	if err := email.NewEmailSender().Send(userRes.User.Email, subject, body); err != nil {
		fmt.Println("[Email] error enviando correo:", err)
	}
}

func (s *OrderService) GetOrderByID(ctx context.Context, orderID int) (*domain.Order, error) {
	return s.repo.GetOrderByID(ctx, orderID)
}

// Necesario para que compile aunque no se use directamente en este archivo
