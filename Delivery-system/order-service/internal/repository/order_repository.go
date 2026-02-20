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

func (r *OrderRepository) DB() *sql.DB {
	return r.db
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

	// Insertar productos
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

	// Commit
	err = tx.Commit()
	if err != nil {
		return 0, err
	}

	return orderID, nil
}

func (r *OrderRepository) GetOrdersByClient(ctx context.Context, clientID int) ([]domain.Order, error) {

	rows, err := r.db.QueryContext(ctx, `
	SELECT Id, ClienteId, ClienteNombre, RestauranteId, RestauranteNombre,
	       Estado, CostoTotal, DireccionEntrega
	FROM Orden
	WHERE ClienteId = @p1
	ORDER BY FechaHoraCreacion DESC
	`, clientID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []domain.Order

	for rows.Next() {
		var o domain.Order

		err := rows.Scan(
			&o.Id,
			&o.ClienteId,
			&o.ClienteNombre,
			&o.RestauranteId,
			&o.RestauranteNombre,
			&o.Estado,
			&o.CostoTotal,
			&o.DireccionEntrega,
			//&o.FechaHoraCreacion,
		)

		if err != nil {
			return nil, err
		}

		orders = append(orders, o)
	}

	return orders, nil
}

func (r *OrderRepository) GetOrdersByRestaurant(ctx context.Context, restaurantID int) ([]domain.Order, error) {

	rows, err := r.db.QueryContext(ctx, `
	SELECT Id, ClienteId, ClienteNombre, RestauranteId, RestauranteNombre,
	       Estado, CostoTotal, DireccionEntrega--, FechaHoraCreacion
	FROM Orden
	WHERE RestauranteId = @p1
	ORDER BY FechaHoraCreacion DESC
	`, restaurantID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []domain.Order

	for rows.Next() {
		var o domain.Order

		err := rows.Scan(
			&o.Id,
			&o.ClienteId,
			&o.ClienteNombre,
			&o.RestauranteId,
			&o.RestauranteNombre,
			&o.Estado,
			&o.CostoTotal,
			&o.DireccionEntrega,
			//&o.FechaHoraCreacion,
		)

		if err != nil {
			return nil, err
		}

		orders = append(orders, o)
	}

	return orders, nil
}

func (r *OrderRepository) AssignDriver(ctx context.Context, orderID int, driverID int) error {

	_, err := r.db.ExecContext(ctx, `
	UPDATE Orden
	SET RepartidorId = @p1,
		Estado = 'EN_CAMINO'
	WHERE Id = @p2
	`, driverID, orderID)

	return err
}

func (r *OrderRepository) GetOrdersByStatus(ctx context.Context, status string) ([]domain.Order, error) {

	query := `
	SELECT 
		Id,
		ClienteId,
		ClienteNombre,
		ClienteTelefono,
		RestauranteId,
		RestauranteNombre,
		Estado,
		DireccionEntrega,
		LatitudEntrega,
		LongitudEntrega,
		CostoTotal
		--,FechaHoraCreacion
	FROM Orden
	WHERE Estado = @p1
	ORDER BY FechaHoraCreacion ASC
	`

	rows, err := r.db.QueryContext(ctx, query, status)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []domain.Order

	for rows.Next() {
		var o domain.Order

		err := rows.Scan(
			&o.Id,
			&o.ClienteId,
			&o.ClienteNombre,
			&o.ClienteTelefono,
			&o.RestauranteId,
			&o.RestauranteNombre,
			&o.Estado,
			&o.DireccionEntrega,
			&o.LatitudEntrega,
			&o.LongitudEntrega,
			&o.CostoTotal,
			//&o.FechaHoraCreacion,
		)
		if err != nil {
			return nil, err
		}

		orders = append(orders, o)
	}

	return orders, nil
}

func (r *OrderRepository) GetOrdersByDriver(
	ctx context.Context,
	driverID int,
) ([]domain.Order, error) {

	query := `
	SELECT
		Id,
		ClienteId,
		ClienteNombre,
		ClienteTelefono,
		RestauranteId,
		RestauranteNombre,
		RepartidorId,
		Estado,
		DireccionEntrega,
		LatitudEntrega,
		LongitudEntrega,
		CostoTotal--,		FechaHoraCreacion
	FROM Orden
	WHERE RepartidorId = @p1
	ORDER BY FechaHoraCreacion DESC
	`

	rows, err := r.db.QueryContext(ctx, query, driverID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []domain.Order

	for rows.Next() {
		var o domain.Order

		err := rows.Scan(
			&o.Id,
			&o.ClienteId,
			&o.ClienteNombre,
			&o.ClienteTelefono,
			&o.RestauranteId,
			&o.RestauranteNombre,
			&o.RepartidorId,
			&o.Estado,
			&o.DireccionEntrega,
			&o.LatitudEntrega,
			&o.LongitudEntrega,
			&o.CostoTotal,
			//&o.FechaHoraCreacion,
		)
		if err != nil {
			return nil, err
		}

		orders = append(orders, o)
	}

	return orders, nil
}

func (r *OrderRepository) GetOrderByID(
	ctx context.Context,
	orderID int,
) (*domain.Order, error) {

	query := `
	SELECT
		Id,
		ClienteId,
		ClienteNombre,
		ClienteTelefono,
		RestauranteId,
		RestauranteNombre,
		--RepartidorId,
		Estado,
		DireccionEntrega,
		LatitudEntrega,
		LongitudEntrega,
		CostoTotal--,		FechaHoraCreacion
	FROM Orden
	WHERE Id = @p1
	`

	row := r.db.QueryRowContext(ctx, query, orderID)

	var o domain.Order

	err := row.Scan(
		&o.Id,
		&o.ClienteId,
		&o.ClienteNombre,
		&o.ClienteTelefono,
		&o.RestauranteId,
		&o.RestauranteNombre,
		//&o.RepartidorId,
		&o.Estado,
		&o.DireccionEntrega,
		&o.LatitudEntrega,
		&o.LongitudEntrega,
		&o.CostoTotal,
		//&o.FechaHoraCreacion,
	)

	if err != nil {
		return nil, err
	}

	items, err := r.GetOrderItems(ctx, orderID)
	if err != nil {
		return nil, err
	}

	o.Items = items

	return &o, nil
}

func (r *OrderRepository) GetOrderItems(
	ctx context.Context,
	orderID int,
) ([]domain.OrderItem, error) {

	query := `
	SELECT
		NombreProducto,
		Cantidad,
		PrecioUnitario
	FROM ProductoOrden
	WHERE OrdenId = @p1
	`

	rows, err := r.db.QueryContext(ctx, query, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.OrderItem

	for rows.Next() {
		var item domain.OrderItem

		err := rows.Scan(
			&item.NombreProducto,
			&item.Cantidad,
			&item.PrecioUnitario,
		)
		if err != nil {
			return nil, err
		}

		items = append(items, item)
	}

	return items, nil
}
