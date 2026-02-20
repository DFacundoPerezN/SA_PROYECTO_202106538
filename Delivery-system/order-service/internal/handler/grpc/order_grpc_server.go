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
	/*fmt.Printf("Received CancelOrder request: order_id=%d, reason=%s, user_id=%d\n", req.OrderId, req.Reason, req.UserId)
	userID, ok := ctx.Value("user_id").(int)
	fmt.Printf("Extracted user_id from context: %d (ok=%v)\n", userID, ok)
	if !ok {
		return nil, status.Error(codes.Unauthenticated, "user not authenticated")
	}*/

	_, err := s.service.CancelOrder(ctx, int(req.OrderId), int(req.UserId), req.Reason)
	if err != nil {
		return nil, err
	}

	return &orderpb.CancelOrderResponse{
		OrderId:   req.OrderId,
		NewStatus: "CANCELADA",
		//CancelledAt: timestamppb.New(cancelledAt),
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
			//FechaCreacion:     o.FechaHoraCreacion.Format("2026-01-02 15:04:05"),
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
			//FechaCreacion:     o.FechaHoraCreacion.Format("2026-01-02 15:04:05"),
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
		protoOrders = append(protoOrders, &orderpb.OrderSummary{
			Id:            int32(o.Id),
			ClienteId:     int32(o.ClienteId),
			ClienteNombre: o.ClienteNombre,
			//ClienteTelefono:   o.ClienteTelefono,
			RestauranteId:     int32(o.RestauranteId),
			RestauranteNombre: o.RestauranteNombre,
			Estado:            o.Estado,
			DireccionEntrega:  o.DireccionEntrega,
			//LatitudEntrega:    o.LatitudEntrega,
			//LongitudEntrega:   o.LongitudEntrega,
			CostoTotal: o.CostoTotal,
		})
	}

	return &orderpb.GetOrdersResponse{
		Orders: protoOrders,
	}, nil
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
			//LatitudEntrega:    o.LatitudEntrega,
			//LongitudEntrega:   o.LongitudEntrega,
			CostoTotal: o.CostoTotal,
		})
	}

	return &orderpb.GetOrdersResponse{
		Orders: protoOrders,
	}, nil
}
