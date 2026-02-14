package service

import (
	"context"
	catalogpb "delivery-proto/catalogpb"
	orderpb "delivery-proto/orderpb"
	"errors"
	"fmt"
	"order-service/internal/domain"
	catalogclient "order-service/internal/grpc"
	"order-service/internal/repository"
)

type OrderService struct {
	repo          *repository.OrderRepository
	catalogClient *catalogclient.CatalogClient
}

func NewOrderService(r *repository.OrderRepository, catalogClient *catalogclient.CatalogClient) *OrderService {
	return &OrderService{repo: r, catalogClient: catalogClient}
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

	return s.repo.CreateOrder(ctx, order)
}
