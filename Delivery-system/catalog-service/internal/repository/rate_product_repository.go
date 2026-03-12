package repository

import (
	"catalog-service/internal/domain"
	"context"
)

func (r *ProductRepository) CreateProductRecommendation(
	ctx context.Context,
	rec *domain.ProductRecommendation,
) (int, error) {

	query := `
	INSERT INTO RecomendacionProducto
	(ClienteId, ProductoId, Recomendado)
	OUTPUT INSERTED.Id
	VALUES (@p1, @p2, @p3)
	`

	var id int

	err := r.db.QueryRowContext(
		ctx,
		query,
		rec.ClienteId,
		rec.ProductoId,
		rec.Recomendado,
	).Scan(&id)

	if err != nil {
		return 0, err
	}

	return id, nil
}

func (r *ProductRepository) GetProductRecommendationPercentage(
	ctx context.Context,
	productID int,
) (float64, int, error) {

	query := `
	SELECT
		ISNULL(
			(CAST(SUM(CASE WHEN Recomendado = 1 THEN 1 ELSE 0 END) AS FLOAT) 
			/ NULLIF(COUNT(*),0)) * 100,
		0),
		COUNT(*)
	FROM RecomendacionProducto
	WHERE ProductoId = @p1
	`

	var percentage float64
	var total int

	err := r.db.QueryRowContext(ctx, query, productID).Scan(&percentage, &total)

	if err != nil {
		return 0, 0, err
	}

	return percentage, total, nil
}
