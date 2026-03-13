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
	restauranteNombre string,
) (int, error) {

	if nombre == "" {
		return 0, errors.New("nombre requerido")
	}

	if precio <= 0 {
		return 0, errors.New("precio invalido")
	}

	if restauranteID <= 0 {
		return 0, errors.New("restauranteID invalido")
	}

	if restauranteNombre == "" {
		return 0, errors.New("restauranteNombre requerido")
	}

	return s.repo.CreateProduct(
		ctx,
		nombre,
		descripcion,
		restauranteID,
		precio,
		categoria,
		restauranteNombre,
	)
}

func (s *ProductService) CreateProductRecommendation(
	ctx context.Context,
	clienteID int,
	productID int,
	recommended bool,
) (int, error) {

	rec := domain.ProductRecommendation{
		ClienteId:   clienteID,
		ProductoId:  productID,
		Recomendado: recommended,
	}

	return s.repo.CreateProductRecommendation(ctx, &rec)
}

func (s *ProductService) GetProductRecommendationPercentage(
	ctx context.Context,
	productID int,
) (float64, int, error) {

	return s.repo.GetProductRecommendationPercentage(ctx, productID)
}

func (s *ProductService) GetRestaurantsByCategory(
	ctx context.Context,
	category string,
) ([]domain.RestaurantCategory, error) {

	return s.repo.GetRestaurantsByCategory(ctx, category)
}
