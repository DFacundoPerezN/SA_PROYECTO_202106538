package repository

import (
	"context"
	"database/sql"
	"time"
)

func (r *OrderRepository) GetOrderStatus(ctx context.Context, orderID int) (string, error) {
	var status string

	err := r.db.QueryRowContext(
		ctx,
		"SELECT Estado FROM Orden WHERE Id = @p1",
		orderID,
	).Scan(&status)

	return status, err
}

func (r *OrderRepository) UpdateOrderStatus(ctx context.Context, orderID int, newStatus string) error {
	_, err := r.db.ExecContext(
		ctx,
		"UPDATE Orden SET Estado = @p1 WHERE Id = @p2",
		newStatus,
		orderID,
	)
	return err
}

type Order struct {
	ID        int
	ClienteID int
	Estado    string
}

func (r *OrderRepository) GetOrderForUpdate(
	ctx context.Context,
	tx *sql.Tx,
	orderID int,
) (*Order, error) {

	query := `
    SELECT Id, ClienteId, Estado
    FROM Orden
    WHERE Id = @p1
    `

	row := tx.QueryRowContext(ctx, query, orderID)

	var o Order
	err := row.Scan(&o.ID, &o.ClienteID, &o.Estado)
	if err != nil {
		return nil, err
	}

	return &o, nil
}

func (r *OrderRepository) UpdateOrderStatusTx(
	ctx context.Context,
	tx *sql.Tx,
	orderID int,
	status string,
) error {

	query := `
    UPDATE Orden
    SET Estado = @p1
    WHERE Id = @p2
    `

	_, err := tx.ExecContext(ctx, query, status, orderID)
	return err
}

func (r *OrderRepository) InsertOrderCancellation(
	ctx context.Context,
	tx *sql.Tx,
	orderID int,
	userID int,
	reason string,
) (time.Time, error) {

	query := `
    INSERT INTO OrdenCancelada (OrdenId, CanceladoPor, Motivo)
    OUTPUT INSERTED.FechaCancelacion
    VALUES (@p1, @p2, @p3)
    `

	var cancelledAt time.Time
	err := tx.QueryRowContext(ctx, query, orderID, userID, reason).Scan(&cancelledAt)
	if err != nil {
		return time.Time{}, err
	}

	return cancelledAt, nil
}
