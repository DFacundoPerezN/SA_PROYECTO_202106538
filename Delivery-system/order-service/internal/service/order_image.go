package service

import (
	"order-service/internal/domain"
)

func (s *OrderService) AddOrderImage(orderID int32, imageURL string) error {
	return s.repo.AddOrderImage(orderID, imageURL)
}

func (s *OrderService) GetOrderImage(orderID int32) (*domain.OrderImage, error) {
	return s.repo.GetOrderImage(orderID)
}
