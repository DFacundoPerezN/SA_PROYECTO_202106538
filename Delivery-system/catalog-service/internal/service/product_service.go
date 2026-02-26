package service

import (
	"catalog-service/internal/domain"
	"catalog-service/internal/repository"
	"context"
	"errors"
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

func (s *ProductService) CreateProduct(
	ctx context.Context,
	nombre string,
	descripcion string,
	restauranteID int,
	precio float64,
	categoria string,
) (int, error) {

	if nombre == "" {
		return 0, errors.New("nombre requerido")
	}

	if precio <= 0 {
		return 0, errors.New("precio invalido")
	}

	return s.repo.CreateProduct(
		ctx,
		nombre,
		descripcion,
		restauranteID,
		precio,
		categoria,
	)
}
