package repository

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"payment-service/internal/domain"
)

type PaymentRepository struct {
	db *sql.DB
}

func NewPaymentRepository(db *sql.DB) *PaymentRepository {
	return &PaymentRepository{db: db}
}

func (r *PaymentRepository) CreatePayment(ctx context.Context, p *domain.Payment) (int, error) {

	// Verificar si ya existe un pago para esta orden.
	// Esto evita el error de constraint UQ_Pago_Orden en caso de reintentos.
	existing, err := r.getPaymentByOrderID(ctx, p.OrdenId)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return 0, fmt.Errorf("error verificando pago existente: %w", err)
	}
	if existing != nil {
		// Ya existe un pago para esta orden: devolver el ID existente en lugar de fallar
		return existing.Id, nil
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

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
		return 0, fmt.Errorf("error insertando pago: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return 0, fmt.Errorf("error confirmando transacción: %w", err)
	}

	return id, nil
}

// getPaymentByOrderID busca un pago existente para una orden.
// Retorna sql.ErrNoRows si no existe ninguno.
func (r *PaymentRepository) getPaymentByOrderID(ctx context.Context, orderID int) (*domain.Payment, error) {
	query := `
	SELECT Id, OrdenId, ClienteId, PrecioFinal, Estado, UsaCupon, MetodoPago, Moneda
	FROM Pagos
	WHERE OrdenId = @p1
	`

	row := r.db.QueryRowContext(ctx, query, orderID)

	var p domain.Payment
	err := row.Scan(
		&p.Id,
		&p.OrdenId,
		&p.ClienteId,
		&p.PrecioFinal,
		&p.Estado,
		&p.UsaCupon,
		&p.MetodoPago,
		&p.Moneda,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, sql.ErrNoRows
	}
	if err != nil {
		return nil, err
	}

	return &p, nil
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

func (r *PaymentRepository) GetPayments(ctx context.Context, clientID int) ([]domain.Payment, error) {

	query := `
	SELECT Id, OrdenId, ClienteId, PrecioFinal, Estado, UsaCupon, MetodoPago, Moneda
	FROM Pagos
	WHERE ClienteId = @p1
	ORDER BY Id DESC
	`

	rows, err := r.db.QueryContext(ctx, query, clientID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var payments []domain.Payment

	for rows.Next() {
		var p domain.Payment

		err := rows.Scan(
			&p.Id,
			&p.OrdenId,
			&p.ClienteId,
			&p.PrecioFinal,
			&p.Estado,
			&p.UsaCupon,
			&p.MetodoPago,
			&p.Moneda,
		)

		if err != nil {
			return nil, err
		}

		payments = append(payments, p)
	}

	return payments, nil
}
