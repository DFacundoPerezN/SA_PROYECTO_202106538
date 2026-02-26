package repository

import (
	"catalog-service/internal/domain"
	"context"
	"database/sql"
	"fmt"
)

type ProductRepository struct {
	db *sql.DB
}

func NewProductRepository(db *sql.DB) *ProductRepository {
	return &ProductRepository{db: db}
}

func (r *ProductRepository) GetByRestaurant(restaurantID int) ([]domain.Product, error) {

	rows, err := r.db.Query(`
		SELECT Id, Nombre, Descripcion, Precio, Disponible, RestauranteId, Categoria
		FROM Producto
		WHERE RestauranteId = @p1
	`, restaurantID)

	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []domain.Product

	for rows.Next() {
		var p domain.Product

		err := rows.Scan(
			&p.ID,
			&p.Nombre,
			&p.Descripcion,
			&p.Precio,
			&p.Disponible,
			&p.RestauranteID,
			&p.Categoria,
		)

		if err != nil {
			return nil, err
		}

		products = append(products, p)
	}

	return products, nil
}

func (r *ProductRepository) GetByIDs(ids []int32) ([]domain.Product, error) {

	query := `
		SELECT Id, Nombre, Descripcion, Precio, Disponible, RestauranteId, Categoria
		FROM Producto
		WHERE Id IN (`
	for i := range ids {
		if i > 0 {
			query += ","
		}
		query += fmt.Sprintf("@p%d", i+1)
	}
	query += ")"

	args := make([]interface{}, len(ids))
	for i, id := range ids {
		args[i] = id
	}

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []domain.Product

	for rows.Next() {
		var p domain.Product

		err := rows.Scan(
			&p.ID,
			&p.Nombre,
			&p.Descripcion,
			&p.Precio,
			&p.Disponible,
			&p.RestauranteID,
			&p.Categoria,
		)

		if err != nil {
			return nil, err
		}

		products = append(products, p)
	}

	return products, nil
}

func (r *ProductRepository) CreateProduct(
	ctx context.Context,
	nombre string,
	descripcion string,
	restauranteID int,
	precio float64,
	categoria string,
) (int, error) {

	query := `
    INSERT INTO Producto (
        Nombre,
        Descripcion,
        Precio,
        RestauranteId,
        Categoria,
        Disponible
    )
    OUTPUT INSERTED.Id
    VALUES (@p1,@p2,@p3,@p4,@p5,1)
    `

	var id int

	err := r.db.QueryRowContext(
		ctx,
		query,
		nombre,
		descripcion,
		precio,
		restauranteID,
		categoria,
	).Scan(&id)

	if err != nil {
		return 0, err
	}

	return id, nil
}
