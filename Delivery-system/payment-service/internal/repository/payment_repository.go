package repository

import (
	"context"
	"database/sql"
	"errors"
	"payment-service/internal/domain"
)

type PaymentRepository struct {
	db *sql.DB
}

func NewPaymentRepository(db *sql.DB) *PaymentRepository {
	return &PaymentRepository{db: db}
}

func (r *PaymentRepository) CreatePayment(ctx context.Context, p *domain.Payment) (int, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}

	query := `
	INSERT INTO Pagos
	(OrdenId, ClienteId, PrecioFinal, Estado, UsaCupon, MetodoPago)
	OUTPUT INSERTED.Id
	VALUES (@p1, @p2, @p3, 'PAGADO', @p4, @p5)
	`

	var id int

	err = tx.QueryRowContext(
		ctx,
		query,
		p.OrdenId,
		p.ClienteId,
		p.PrecioFinal,
		p.UsaCupon,
		p.MetodoPago,
	).Scan(&id)

	if err != nil {
		tx.Rollback()
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, err
	}

	return id, nil
}

func (r *PaymentRepository) UpdateStatus(ctx context.Context, orderId int, newStatus string) error {

	query := `
	UPDATE Pagos
	SET Estado = @p1
	WHERE OrdenId = @p2
	`

	result, err := r.db.ExecContext(ctx, query, newStatus, orderId)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return errors.New("no se encontró el pago")
	}

	return nil
}
