package grpc

import (
	"context"

	restaurantpb "delivery-proto/restaurantpb"
	"restaurant-service/internal/service"
)

type RestaurantGRPCServer struct {
	restaurantpb.UnimplementedRestaurantServiceServer
	service   *service.RestaurantService
	promocion *service.PromocionService
}

func NewRestaurantGRPCServer(s *service.RestaurantService, p *service.PromocionService) *RestaurantGRPCServer {
	return &RestaurantGRPCServer{service: s, promocion: p}
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

// ─── Promociones ─────────────────────────────────────────────────────────────

func (s *RestaurantGRPCServer) CreatePromocion(
	ctx context.Context,
	req *restaurantpb.CreatePromocionRequest,
) (*restaurantpb.CreatePromocionResponse, error) {

	id, err := s.promocion.CreatePromocion(ctx, req)
	if err != nil {
		return nil, err
	}

	return &restaurantpb.CreatePromocionResponse{
		Id:      int32(id),
		Message: "Promoción creada exitosamente",
	}, nil
}

func (s *RestaurantGRPCServer) GetPromociones(
	ctx context.Context,
	req *restaurantpb.GetPromocionesRequest,
) (*restaurantpb.GetPromocionesResponse, error) {

	promociones, err := s.promocion.GetPromociones(ctx, req)
	if err != nil {
		return nil, err
	}

	var result []*restaurantpb.Promocion
	for _, p := range promociones {
		result = append(result, &restaurantpb.Promocion{
			Id:            int32(p.Id),
			RestauranteId: int32(p.RestauranteId),
			Titulo:        p.Titulo,
			Descripcion:   p.Descripcion,
			Tipo:          p.Tipo,
			Valor:         p.Valor,
			FechaInicio:   p.FechaInicio.Format("2006-01-02T15:04:05"),
			FechaFin:      p.FechaFin.Format("2006-01-02T15:04:05"),
			Activa:        p.Activa,
		})
	}

	return &restaurantpb.GetPromocionesResponse{
		Promociones: result,
	}, nil
}

func (s *RestaurantGRPCServer) UpdatePromocion(
	ctx context.Context,
	req *restaurantpb.UpdatePromocionRequest,
) (*restaurantpb.UpdatePromocionResponse, error) {

	if err := s.promocion.UpdatePromocion(ctx, req); err != nil {
		return nil, err
	}

	return &restaurantpb.UpdatePromocionResponse{
		Message: "Promoción actualizada exitosamente",
	}, nil
}
