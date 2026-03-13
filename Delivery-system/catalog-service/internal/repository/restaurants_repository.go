package repository

import (
	"catalog-service/internal/domain"
	"context"
)

func (r *ProductRepository) GetRestaurantsByCategory(
	ctx context.Context,
	category string,
) ([]domain.RestaurantCategory, error) {

	query := `
	SELECT DISTINCT
		RestauranteId,
		RestauranteNombre
	FROM Producto
	WHERE Categoria LIKE '%' + @p1 + '%'
	AND Disponible = 1
	`

	rows, err := r.db.QueryContext(ctx, query, category)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var restaurants []domain.RestaurantCategory

	for rows.Next() {
		var res domain.RestaurantCategory

		err := rows.Scan(
			&res.RestauranteId,
			&res.RestauranteNombre,
		)

		if err != nil {
			return nil, err
		}

		restaurants = append(restaurants, res)
	}

	return restaurants, nil
}
