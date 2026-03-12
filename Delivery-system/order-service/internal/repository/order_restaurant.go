package repository

import (
	"context"
	"order-service/internal/domain"
)

func (r *OrderRepository) GetTopRestaurantsByOrders(
	ctx context.Context,
	limit int,
) ([]domain.TopRestaurantOrders, error) {

	query := `
	SELECT TOP (@p1)
		RestauranteId,
		RestauranteNombre,
		COUNT(*) AS TotalOrdenes
	FROM Orden
	GROUP BY RestauranteId, RestauranteNombre
	ORDER BY TotalOrdenes DESC
	`

	rows, err := r.db.QueryContext(ctx, query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.TopRestaurantOrders

	for rows.Next() {
		var r domain.TopRestaurantOrders

		err := rows.Scan(&r.RestauranteId, &r.RestauranteNombre, &r.TotalOrdenes)
		if err != nil {
			return nil, err
		}

		result = append(result, r)
	}

	return result, nil
}
