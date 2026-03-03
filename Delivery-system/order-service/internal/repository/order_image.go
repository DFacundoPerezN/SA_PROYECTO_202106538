package repository

import (
	"order-service/internal/domain"
)

func (r *OrderRepository) AddOrderImage(orderID int32, imageURL string) error {
	query := `
		INSERT INTO ImagenOrden (OrdenId, Link)
		VALUES (@p1, @p2)
	`

	_, err := r.db.Exec(query, orderID, imageURL)
	return err
}

func (r *OrderRepository) GetOrderImage(orderID int32) (*domain.OrderImage, error) {

	query := `
		SELECT OrdenId, Link
		FROM ImagenOrden
		WHERE OrdenId = @p1
	`

	row := r.db.QueryRow(query, orderID)

	var img domain.OrderImage
	err := row.Scan(&img.OrdenId, &img.Link)
	if err != nil {
		return nil, err
	}

	return &img, nil
}
