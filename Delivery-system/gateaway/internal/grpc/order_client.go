package grpc

import (
	"context"
	"time"

	orderpb "delivery-proto/orderpb"

	"google.golang.org/grpc"
)

type OrderClient struct {
	client orderpb.OrderServiceClient
}

func NewOrderClient(address string) (*OrderClient, error) {

	conn, err := grpc.Dial(address, grpc.WithInsecure())
	if err != nil {
		return nil, err
	}

	client := orderpb.NewOrderServiceClient(conn)

	return &OrderClient{client: client}, nil
}

func (o *OrderClient) CreateOrder(req *orderpb.CreateOrderRequest) (*orderpb.CreateOrderResponse, error) {

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return o.client.CreateOrder(ctx, req)
}
