package service

import (
	"catalog-service/internal/domain"
	"catalog-service/internal/repository"
)

type ProductService struct {
	repo *repository.ProductRepository
}

func NewProductService(r *repository.ProductRepository) *ProductService {
	return &ProductService{repo: r}
}

func (s *ProductService) GetCatalog(restaurantID int) ([]domain.Product, error) {
	return s.repo.GetByRestaurant(restaurantID)
}

func (s *ProductService) GetProductsByIDs(ids []int32) ([]domain.Product, error) {
	return s.repo.GetByIDs(ids)
}
