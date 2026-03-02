package repository

func (r *OrderRepository) AddOrderImage(orderID int32, imageURL string) error {
	query := `
		INSERT INTO ImagenOrden (OrdenId, Link)
		VALUES (@p1, @p2)
	`

	_, err := r.db.Exec(query, orderID, imageURL)
	return err
}
