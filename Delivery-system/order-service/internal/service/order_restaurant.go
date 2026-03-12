package service

import (
	"context"
	"order-service/internal/domain"
)

func (s *OrderService) GetTopRestaurantsByOrders(
	ctx context.Context,
	limit int,
) ([]domain.TopRestaurantOrders, error) {

	return s.repo.GetTopRestaurantsByOrders(ctx, limit)
}
