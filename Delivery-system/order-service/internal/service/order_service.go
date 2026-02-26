package service

import (
	"context"
	catalogpb "delivery-proto/catalogpb"
	notificationpb "delivery-proto/notificationpb"
	orderpb "delivery-proto/orderpb"
	"errors"
	"fmt"
	"order-service/internal/domain"
	"order-service/internal/email"
	catalogclient "order-service/internal/grpc"
	"order-service/internal/repository"
	"time"
)

type OrderService struct {
	repo               *repository.OrderRepository
	catalogClient      *catalogclient.CatalogClient
	userClient         *catalogclient.UserClient
	notificationClient *catalogclient.NotificationClient
}

func NewOrderService(r *repository.OrderRepository, catalogClient *catalogclient.CatalogClient, userClient *catalogclient.UserClient, notificationClient *catalogclient.NotificationClient) *OrderService {
	return &OrderService{repo: r,
		catalogClient:      catalogClient,
		userClient:         userClient,
		notificationClient: notificationClient,
	}
}

func (s *OrderService) CreateOrder(ctx context.Context, req *orderpb.CreateOrderRequest) (int, error) {
	//fmt.Println("Creating order for client:", req, "with", len(req.Items), "items")

	if len(req.Items) == 0 {
		return 0, errors.New("La orden no tiene productos")
	}

	var total float64
	var restaurantID int32 = -1

	order := &domain.Order{
		ClienteId:         int32(req.ClientId),
		ClienteNombre:     req.ClientName,
		ClienteTelefono:   req.ClientPhone,
		DireccionEntrega:  req.Address,
		LatitudEntrega:    req.Lat,
		LongitudEntrega:   req.Lng,
		RestauranteId:     req.RestaurantId,
		RestauranteNombre: req.RestaurantName,
		CostoTotal:        0, // luego lo calcularemos con catalog-service
	}

	productIDs := []int32{}
	//guardamos los productos en lista
	for _, item := range req.Items {
		productIDs = append(productIDs, item.ProductId)
	}

	catalogResp, err := s.catalogClient.GetProductsByIDs(productIDs)
	if err != nil {
		return 0, fmt.Errorf("error consultando catalog-service: %w", err)
	}

	productsMap := make(map[int32]*catalogpb.Product)

	for _, p := range catalogResp {
		productsMap[p.Id] = p
	}

	for _, item := range req.Items {

		product, exist := productsMap[item.ProductId]
		if !exist {
			return 0, fmt.Errorf("producto %d no existe", item.ProductId)
		}

		//revisar disponibilidad del producto
		if !product.Disponible {
			return 0, fmt.Errorf("producto %s no disponible", product.Nombre)
		}

		//revisar que todos los productos sean del mismo restaurante
		if restaurantID == -1 {
			restaurantID = product.RestaurantId
		} else if restaurantID != product.RestaurantId {
			return 0, errors.New("todos los productos deben ser del mismo restaurante")
		}

		total += product.Precio * float64(item.Quantity)

		order.Items = append(order.Items, domain.OrderItem{
			ProductoId:     int32(item.ProductId),
			NombreProducto: product.Nombre,
			PrecioUnitario: product.Precio,
			Cantidad:       int32(item.Quantity),
			Comentarios:    item.Comments,
		})

	}

	order.CostoTotal = total

	orderID, err := s.repo.CreateOrder(ctx, order)
	if err != nil {
		return 0, fmt.Errorf("error creando orden: %w", err)
	}

	go s.sendOrderCreatedEmail(int(orderID))
	return orderID, nil
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

	//fmt.Printf("Notificando asignación de conductor para orden %d y conductor %d\n", orderID, driverID)

	// 1️ Orden
	order, err := s.repo.GetOrderByID(ctx, orderID)
	if err != nil {
		return
	}

	// 2️ Items
	items, err := s.repo.GetOrderItems(ctx, orderID)
	if err != nil {
		return
	}

	// 3️ Obtener repartidor desde user-service
	driverResp, err := s.userClient.GetUser(int32(driverID))
	if err != nil {
		return
	}

	// 4️ convertir productos
	var protoItems []*notificationpb.AssignedProduct

	for _, it := range items {
		protoItems = append(protoItems, &notificationpb.AssignedProduct{
			Name:     it.NombreProducto,
			Quantity: int32(it.Cantidad),
		})
	}

	// Cliente
	clientResp, err := s.userClient.GetUser(order.ClienteId)
	if err != nil {
		return
	}

	//fmt.Printf("Enviando notificación de asignación de conductor para orden %d al cliente %s (%s)\n", orderID, clientResp.User.NombreCompleto, clientResp.User.Email)

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

func (s *OrderService) GetDriverOrders(
	ctx context.Context,
	driverID int,
) ([]domain.Order, error) {

	return s.repo.GetOrdersByDriver(ctx, driverID)
}

func (s *OrderService) sendOrderCreatedEmail(orderID int) {

	// Obtener info completa de la orden
	order, err := s.repo.GetOrderByID(context.Background(), orderID)
	if err != nil {
		fmt.Println("error obteniendo orden:", err)
		return
	}

	// obtener cliente
	userRes, err := s.userClient.GetUser(order.ClienteId)
	if err != nil {
		fmt.Println("error obteniendo usuario:", err)
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
		FechaCreacion: time.Now().Format("02 Jan 2026 15:04"),
		Estado:        "CREADA",
	}

	subject, body := email.BuildOrderCreatedEmail(emailData)

	err = email.NewEmailSender().Send(userRes.User.Email, subject, body)
	if err != nil {
		fmt.Println("error enviando correo:", err)
	}
}

func (s *OrderService) GetOrderByID(
	ctx context.Context,
	orderID int,
) (*domain.Order, error) {

	return s.repo.GetOrderByID(ctx, orderID)
}
