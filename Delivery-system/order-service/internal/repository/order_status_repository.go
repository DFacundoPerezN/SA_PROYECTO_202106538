package repository

import (
	"context"
	"database/sql"
	"fmt"
	"order-service/internal/domain"
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

func (r *OrderRepository) GetCancelledOrRejectedOrders() ([]domain.CancelledOrRejectedOrder, error) {

	query := `
		SELECT 
			o.Id,
			o.Estado,
			o.ClienteNombre,
			o.CostoTotal,
			oc.Motivo
		FROM Orden o
		LEFT JOIN OrdenCancelada oc ON o.Id = oc.OrdenId
		WHERE o.Estado IN ('CANCELADA', 'RECHAZADA')
	`

	rows, err := r.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []domain.CancelledOrRejectedOrder

	for rows.Next() {
		var order domain.CancelledOrRejectedOrder

		err := rows.Scan(
			&order.Id,
			&order.Estado,
			&order.ClienteNombre,
			&order.CostoTotal,
			&order.Motivo,
		)
		if err != nil {
			return nil, err
		}

		orders = append(orders, order)
	}

	return orders, nil
}

// AutoRejectStaleCreatedOrders marks orders as RECHAZADA only when they are still
// in CREADA state and older than the provided threshold in minutes.
// The UPDATE + OUTPUT makes this operation idempotent and safe against duplicates.
func (r *OrderRepository) AutoRejectStaleCreatedOrders(ctx context.Context, olderThanMinutes int) ([]int, error) {
	if olderThanMinutes <= 0 {
		olderThanMinutes = 60
	}

	query := `
		UPDATE Orden
		SET Estado = 'RECHAZADA'
		OUTPUT INSERTED.Id
		WHERE Estado = 'CREADA'
		  AND DATEDIFF(MINUTE, FechaHoraCreacion, SYSUTCDATETIME()) >= @p1
	`

	rows, err := r.db.QueryContext(ctx, query, olderThanMinutes)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	ids := make([]int, 0)
	for rows.Next() {
		var id int
		if scanErr := rows.Scan(&id); scanErr != nil {
			return nil, scanErr
		}
		ids = append(ids, id)
	}

	if rowsErr := rows.Err(); rowsErr != nil {
		return nil, rowsErr
	}

	if ids == nil {
		return []int{}, nil
	}

	fmt.Printf("[auto-reject] updated stale created orders: %d\n", len(ids))

	return ids, nil
}
