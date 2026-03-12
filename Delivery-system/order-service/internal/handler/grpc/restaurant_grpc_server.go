package grpc

import (
	"context"
	orderpb "delivery-proto/orderpb"
)

func (s *OrderGRPCServer) GetTopRestaurantsByOrders(
	ctx context.Context,
	req *orderpb.GetTopRestaurantsByOrdersRequest,
) (*orderpb.GetTopRestaurantsByOrdersResponse, error) {

	data, err := s.service.GetTopRestaurantsByOrders(ctx, int(req.Limit))
	if err != nil {
		return nil, err
	}

	var result []*orderpb.TopRestaurantOrders

	for _, d := range data {
		result = append(result, &orderpb.TopRestaurantOrders{
			RestauranteId:     int32(d.RestauranteId),
			TotalOrdenes:      int32(d.TotalOrdenes),
			RestauranteNombre: d.RestauranteNombre,
		})
	}

	return &orderpb.GetTopRestaurantsByOrdersResponse{
		Restaurants: result,
	}, nil
}
