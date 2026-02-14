package repository

import (
	"context"
	"database/sql"
	"order-service/internal/domain"
)

type OrderRepository struct {
	db *sql.DB
}

func NewOrderRepository(db *sql.DB) *OrderRepository {
	return &OrderRepository{db: db}
}

func (r *OrderRepository) CreateOrder(ctx context.Context, order *domain.Order) (int, error) {

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}

	// rollback automático si algo falla
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	// Insertar Orden
	orderQuery := `
	INSERT INTO Orden (
		ClienteId,
		ClienteNombre,
		ClienteTelefono,
		RestauranteId,
		RestauranteNombre,
		DireccionEntrega,
		LatitudEntrega,
		LongitudEntrega,
		CostoTotal
	)
	OUTPUT INSERTED.Id
	VALUES (@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8,@p9)
	`

	var orderID int

	err = tx.QueryRowContext(
		ctx,
		orderQuery,
		order.ClienteId,
		order.ClienteNombre,
		order.ClienteTelefono,
		order.RestauranteId,
		order.RestauranteNombre,
		order.DireccionEntrega,
		order.LatitudEntrega,
		order.LongitudEntrega,
		order.CostoTotal,
	).Scan(&orderID)

	if err != nil {
		return 0, err
	}

	// 2️. Insertar productos
	itemQuery := `
	INSERT INTO ProductoOrden (
		OrdenId,
		ProductoId,
		NombreProducto,
		PrecioUnitario,
		Cantidad,
		Comentarios
	)
	VALUES (@p1,@p2,@p3,@p4,@p5,@p6)
	`

	for _, item := range order.Items {

		_, err = tx.ExecContext(
			ctx,
			itemQuery,
			orderID,
			item.ProductoId,
			item.NombreProducto,
			item.PrecioUnitario,
			item.Cantidad,
			item.Comentarios,
		)

		if err != nil {
			return 0, err
		}
	}

	// 3️⃣ Commit
	err = tx.Commit()
	if err != nil {
		return 0, err
	}

	return orderID, nil
}
