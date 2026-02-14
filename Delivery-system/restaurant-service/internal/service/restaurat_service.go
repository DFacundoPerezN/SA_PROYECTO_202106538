package service

import (
	"context"
	"restaurant-service/internal/repository"
)

type RestaurantService struct {
	repo *repository.RestaurantRepository
}

func NewRestaurantService(r *repository.RestaurantRepository) *RestaurantService {
	return &RestaurantService{repo: r}
}

func (s *RestaurantService) ListRestaurants(ctx context.Context) ([]repository.Restaurant, error) {
	return s.repo.ListRestaurants(ctx)
}
