package grpc

import (
	"context"

	"order-service/internal/service"

	orderpb "delivery-proto/orderpb"
)

type OrderGRPCServer struct {
	orderpb.UnimplementedOrderServiceServer
	service *service.OrderService
}

func NewOrderGRPCServer(s *service.OrderService) *OrderGRPCServer {
	return &OrderGRPCServer{service: s}
}

// CreateOrder valida, calcula el total, encola la orden y espera a que
// el consumer la persista en BD. Devuelve el ID real de la orden.
func (s *OrderGRPCServer) CreateOrder(
	ctx context.Context,
	req *orderpb.CreateOrderRequest,
) (*orderpb.CreateOrderResponse, error) {

	orderID, err := s.service.CreateOrder(ctx, req)
	if err != nil {
		return nil, err
	}

	return &orderpb.CreateOrderResponse{
		OrderId: int32(orderID),
		Estado:  "CREADA",
	}, nil
}

func (s *OrderGRPCServer) UpdateOrderStatus(
	ctx context.Context,
	req *orderpb.UpdateOrderStatusRequest,
) (*orderpb.UpdateOrderStatusResponse, error) {

	status, err := s.service.UpdateOrderStatus(ctx, int(req.OrderId), req.NewStatus)
	if err != nil {
		return nil, err
	}

	return &orderpb.UpdateOrderStatusResponse{
		OrderId: req.OrderId,
		Status:  status,
	}, nil
}

func (s *OrderGRPCServer) CancelOrder(ctx context.Context, req *orderpb.CancelOrderRequest) (*orderpb.CancelOrderResponse, error) {
	_, err := s.service.CancelOrder(ctx, int(req.OrderId), int(req.UserId), req.Reason)
	if err != nil {
		return nil, err
	}

	return &orderpb.CancelOrderResponse{
		OrderId:   req.OrderId,
		NewStatus: "CANCELADA",
	}, nil
}

func (s *OrderGRPCServer) GetOrdersByClient(
	ctx context.Context,
	req *orderpb.GetOrdersByClientRequest,
) (*orderpb.GetOrdersResponse, error) {

	orders, err := s.service.GetOrdersByClient(ctx, int(req.ClientId))
	if err != nil {
		return nil, err
	}

	var response orderpb.GetOrdersResponse
	for _, o := range orders {
		response.Orders = append(response.Orders, &orderpb.OrderSummary{
			Id:                int32(o.Id),
			ClienteId:         int32(o.ClienteId),
			ClienteNombre:     o.ClienteNombre,
			RestauranteId:     int32(o.RestauranteId),
			RestauranteNombre: o.RestauranteNombre,
			Estado:            o.Estado,
			CostoTotal:        o.CostoTotal,
			DireccionEntrega:  o.DireccionEntrega,
		})
	}

	return &response, nil
}

func (s *OrderGRPCServer) GetOrdersByRestaurant(
	ctx context.Context,
	req *orderpb.GetOrdersByRestaurantRequest,
) (*orderpb.GetOrdersResponse, error) {

	orders, err := s.service.GetOrdersByRestaurant(ctx, int(req.RestaurantId))
	if err != nil {
		return nil, err
	}

	var response orderpb.GetOrdersResponse
	for _, o := range orders {
		response.Orders = append(response.Orders, &orderpb.OrderSummary{
			Id:                int32(o.Id),
			ClienteId:         int32(o.ClienteId),
			ClienteNombre:     o.ClienteNombre,
			RestauranteId:     int32(o.RestauranteId),
			RestauranteNombre: o.RestauranteNombre,
			Estado:            o.Estado,
			CostoTotal:        o.CostoTotal,
			DireccionEntrega:  o.DireccionEntrega,
		})
	}

	return &response, nil
}

func (s *OrderGRPCServer) AssignDriver(
	ctx context.Context,
	req *orderpb.AssignDriverRequest,
) (*orderpb.AssignDriverResponse, error) {

	err := s.service.AssignDriver(ctx, int(req.OrderId), int(req.DriverId))
	if err != nil {
		return nil, err
	}

	return &orderpb.AssignDriverResponse{
		OrderId: req.OrderId,
		Status:  "EN_CAMINO",
		Message: "Repartidor asignado correctamente",
	}, nil
}

func (s *OrderGRPCServer) GetFinishedOrders(
	ctx context.Context,
	req *orderpb.GetFinishedOrdersRequest,
) (*orderpb.GetOrdersResponse, error) {

	orders, err := s.service.GetFinishedOrders(ctx)
	if err != nil {
		return nil, err
	}

	var protoOrders []*orderpb.OrderSummary
	for _, o := range orders {
		products := make([]*orderpb.ProductoOrdenSummary, 0, len(o.Items))
		for _, item := range o.Items {
			products = append(products, &orderpb.ProductoOrdenSummary{
				ProductoId:     item.ProductoId,
				NombreProducto: item.NombreProducto,
				Cantidad:       item.Cantidad,
				PrecioUnitario: item.PrecioUnitario,
			})
		}

		protoOrders = append(protoOrders, &orderpb.OrderSummary{
			Id:                int32(o.Id),
			ClienteId:         int32(o.ClienteId),
			ClienteNombre:     o.ClienteNombre,
			RestauranteId:     int32(o.RestauranteId),
			RestauranteNombre: o.RestauranteNombre,
			RepartidorId:      int32(o.RepartidorId),
			Estado:            o.Estado,
			DireccionEntrega:  o.DireccionEntrega,
			CostoTotal:        o.CostoTotal,
			Productos:         products,
		})
	}

	return &orderpb.GetOrdersResponse{Orders: protoOrders}, nil
}

func (s *OrderGRPCServer) GetDeliveredOrders(
	ctx context.Context,
	req *orderpb.GetDeliveredOrdersRequest,
) (*orderpb.GetOrdersResponse, error) {

	orders, err := s.service.GetDeliveredOrders(ctx)
	if err != nil {
		return nil, err
	}

	var protoOrders []*orderpb.OrderSummary
	for _, o := range orders {
		products := make([]*orderpb.ProductoOrdenSummary, 0, len(o.Items))
		for _, item := range o.Items {
			products = append(products, &orderpb.ProductoOrdenSummary{
				ProductoId:     item.ProductoId,
				NombreProducto: item.NombreProducto,
				Cantidad:       item.Cantidad,
				PrecioUnitario: item.PrecioUnitario,
			})
		}

		protoOrders = append(protoOrders, &orderpb.OrderSummary{
			Id:                int32(o.Id),
			ClienteId:         int32(o.ClienteId),
			ClienteNombre:     o.ClienteNombre,
			RestauranteId:     int32(o.RestauranteId),
			RestauranteNombre: o.RestauranteNombre,
			RepartidorId:      int32(o.RepartidorId),
			Estado:            o.Estado,
			DireccionEntrega:  o.DireccionEntrega,
			CostoTotal:        o.CostoTotal,
			Productos:         products,
		})
	}

	return &orderpb.GetOrdersResponse{Orders: protoOrders}, nil
}

func (s *OrderGRPCServer) GetOrdersByDriver(
	ctx context.Context,
	req *orderpb.GetOrdersByDriverRequest,
) (*orderpb.GetOrdersResponse, error) {

	orders, err := s.service.GetDriverOrders(ctx, int(req.DriverId))
	if err != nil {
		return nil, err
	}

	var protoOrders []*orderpb.OrderSummary
	for _, o := range orders {
		protoOrders = append(protoOrders, &orderpb.OrderSummary{
			Id:                int32(o.Id),
			ClienteId:         int32(o.ClienteId),
			ClienteNombre:     o.ClienteNombre,
			ClienteTelefono:   o.ClienteTelefono,
			RestauranteId:     int32(o.RestauranteId),
			RestauranteNombre: o.RestauranteNombre,
			RepartidorId:      int32(o.RepartidorId),
			Estado:            o.Estado,
			DireccionEntrega:  o.DireccionEntrega,
			CostoTotal:        o.CostoTotal,
		})
	}

	return &orderpb.GetOrdersResponse{Orders: protoOrders}, nil
}

func (h *OrderGRPCServer) AddOrderImage(
	ctx context.Context,
	req *orderpb.AddOrderImageRequest,
) (*orderpb.AddOrderImageResponse, error) {

	err := h.service.AddOrderImage(req.OrderId, req.ImageUrl)
	if err != nil {
		return nil, err
	}

	return &orderpb.AddOrderImageResponse{Message: "Imagen agregada correctamente"}, nil
}

func (h *OrderGRPCServer) GetOrderImage(
	ctx context.Context,
	req *orderpb.GetOrderImageRequest,
) (*orderpb.GetOrderImageResponse, error) {

	img, err := h.service.GetOrderImage(req.OrderId)
	if err != nil {
		return nil, err
	}

	return &orderpb.GetOrderImageResponse{
		OrderId: img.OrdenId,
		Link:    img.Link,
	}, nil
}

func (h *OrderGRPCServer) GetCancelledOrRejectedOrders(
	ctx context.Context,
	_ *orderpb.GetCancelledOrdersRequest,
) (*orderpb.GetCancelledOrRejectedOrdersResponse, error) {

	orders, err := h.service.GetCancelledOrRejectedOrders()
	if err != nil {
		return nil, err
	}

	var responseOrders []*orderpb.CancelledOrRejectedOrder
	for _, o := range orders {
		motivo := "Orden rechazada por el restaurante"
		if o.Motivo.Valid {
			motivo = o.Motivo.String
		}

		responseOrders = append(responseOrders, &orderpb.CancelledOrRejectedOrder{
			Id:            o.Id,
			Estado:        o.Estado,
			ClienteNombre: o.ClienteNombre,
			CostoTotal:    o.CostoTotal,
			Motivo:        motivo,
		})
	}

	return &orderpb.GetCancelledOrRejectedOrdersResponse{Orders: responseOrders}, nil
}
