package service

import (
	"context"
	"delivery-proto/restaurantpb"
	"restaurant-service/internal/domain"
	grpcclient "restaurant-service/internal/grpc"
	"restaurant-service/internal/repository"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type RestaurantService struct {
	repo       *repository.RestaurantRepository
	userClient *grpcclient.UserClient
}

func NewRestaurantService(r *repository.RestaurantRepository, u *grpcclient.UserClient) *RestaurantService {
	return &RestaurantService{repo: r, userClient: u}
}

func (s *RestaurantService) ListRestaurants(ctx context.Context) ([]repository.Restaurant, error) {
	return s.repo.ListRestaurants(ctx)
}

func (s *RestaurantService) CreateRestaurant(ctx context.Context, req *restaurantpb.CreateRestaurantRequest) (int, error) {

	// 1️ verificar usuario
	userResp, err := s.userClient.GetUserByID(ctx, req.UserId)
	if err != nil {
		return 0, status.Error(codes.NotFound, "user does not exist")
	}

	// 2️ validar rol
	if userResp.User.Role != "RESTAURANTE" && userResp.User.Role != "ADMINISTRADOR" {
		return 0, status.Error(codes.PermissionDenied, "user is not a restaurant; role is: "+userResp.User.Role)
	}

	// 3️ evitar duplicados
	exists, err := s.repo.Exists(ctx, int(req.UserId))
	if err != nil {
		return 0, status.Error(codes.Internal, "database error")
	}
	if exists {
		return 0, status.Error(codes.AlreadyExists, "restaurant already exists")
	}

	// 4️ crear
	rest := &domain.Restaurant{
		ID:              int(req.UserId),
		Nombre:          req.Nombre,
		Direccion:       req.Direccion,
		Latitud:         req.Latitud,
		Longitud:        req.Longitud,
		Telefono:        req.Telefono,
		HorarioApertura: req.HorarioApertura,
		HorarioCierre:   req.HorarioCierre,
	}

	err = s.repo.Create(ctx, rest)
	if err != nil {
		return 0, status.Error(codes.Internal, "could not create restaurant")
	}

	return int(req.UserId), nil
}
