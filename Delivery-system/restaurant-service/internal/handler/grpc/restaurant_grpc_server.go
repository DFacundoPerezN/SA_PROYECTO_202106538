package grpc

import (
	"context"

	restaurantpb "delivery-proto/restaurantpb"
	"restaurant-service/internal/service"
)

type RestaurantGRPCServer struct {
	restaurantpb.UnimplementedRestaurantServiceServer
	service *service.RestaurantService
}

func NewRestaurantGRPCServer(s *service.RestaurantService) *RestaurantGRPCServer {
	return &RestaurantGRPCServer{service: s}
}

func (s *RestaurantGRPCServer) ListRestaurants(ctx context.Context, req *restaurantpb.Empty) (*restaurantpb.RestaurantListResponse, error) {

	data, err := s.service.ListRestaurants(ctx)
	if err != nil {
		return nil, err
	}

	var restaurants []*restaurantpb.Restaurant

	for _, r := range data {
		restaurants = append(restaurants, &restaurantpb.Restaurant{
			Id:           r.Id,
			Nombre:       r.Nombre,
			Direccion:    r.Direccion,
			Latitud:      r.Latitud,
			Longitud:     r.Longitud,
			Telefono:     r.Telefono,
			Calificacion: r.Calificacion,
			Activo:       r.Activo,
		})
	}

	return &restaurantpb.RestaurantListResponse{
		Restaurants: restaurants,
	}, nil

}

func (s *RestaurantGRPCServer) CreateRestaurant(
	ctx context.Context,
	req *restaurantpb.CreateRestaurantRequest,
) (*restaurantpb.CreateRestaurantResponse, error) {

	id, err := s.service.CreateRestaurant(ctx, req)
	if err != nil {
		return nil, err
	}

	return &restaurantpb.CreateRestaurantResponse{
		RestaurantId: int32(id),
		Message:      "restaurant created successfully",
	}, nil
}
