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
