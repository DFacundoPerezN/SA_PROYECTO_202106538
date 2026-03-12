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

func (s *RestaurantGRPCServer) CreateRestaurantRating(
	ctx context.Context,
	req *restaurantpb.CreateRestaurantRatingRequest,
) (*restaurantpb.CreateRestaurantRatingResponse, error) {

	id, err := s.service.CreateRestaurantRating(ctx, req)
	if err != nil {
		return nil, err
	}

	return &restaurantpb.CreateRestaurantRatingResponse{
		RatingId: int32(id),
		Message:  "Calificación registrada",
	}, nil
}

func (s *RestaurantGRPCServer) GetRestaurantRatingAverage(
	ctx context.Context,
	req *restaurantpb.GetRestaurantRatingAverageRequest,
) (*restaurantpb.GetRestaurantRatingAverageResponse, error) {

	avg, total, err := s.service.GetRestaurantRatingAverage(ctx, int(req.RestauranteId))
	if err != nil {
		return nil, err
	}

	return &restaurantpb.GetRestaurantRatingAverageResponse{
		Promedio:            avg,
		TotalCalificaciones: int32(total),
	}, nil
}

func (s *RestaurantGRPCServer) GetLatestRestaurants(
	ctx context.Context,
	req *restaurantpb.GetLatestRestaurantsRequest,
) (*restaurantpb.GetRestaurantsResponse, error) {

	restaurants, err := s.service.GetLatestRestaurants(ctx, int(req.Limit))
	if err != nil {
		return nil, err
	}

	var result []*restaurantpb.Restaurant

	for _, r := range restaurants {

		result = append(result, &restaurantpb.Restaurant{
			Id:           int32(r.ID),
			Nombre:       r.Nombre,
			Direccion:    r.Direccion,
			Calificacion: r.Calificacion,
		})
	}

	return &restaurantpb.GetRestaurantsResponse{
		Restaurants: result,
	}, nil
}

func (s *RestaurantGRPCServer) GetTopRatedRestaurants(
	ctx context.Context,
	req *restaurantpb.GetTopRatedRestaurantsRequest,
) (*restaurantpb.GetRestaurantsResponse, error) {

	restaurants, err := s.service.GetTopRatedRestaurants(ctx, int(req.Limit))
	if err != nil {
		return nil, err
	}

	var result []*restaurantpb.Restaurant

	for _, r := range restaurants {

		result = append(result, &restaurantpb.Restaurant{
			Id:           int32(r.ID),
			Nombre:       r.Nombre,
			Direccion:    r.Direccion,
			Calificacion: r.Calificacion,
		})
	}

	return &restaurantpb.GetRestaurantsResponse{
		Restaurants: result,
	}, nil
}
