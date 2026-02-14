package repository

import (
	"context"
	"database/sql"
)

type Restaurant struct {
	Id           int32
	Nombre       string
	Direccion    string
	Latitud      float64
	Longitud     float64
	Telefono     string
	Calificacion float64
	Activo       bool
}

type RestaurantRepository struct {
	db *sql.DB
}

func NewRestaurantRepository(db *sql.DB) *RestaurantRepository {
	return &RestaurantRepository{db: db}
}

func (r *RestaurantRepository) ListRestaurants(ctx context.Context) ([]Restaurant, error) {

	rows, err := r.db.QueryContext(ctx, `
	SELECT 
		Id, Nombre, Direccion, 
		ISNULL(Latitud,0), ISNULL(Longitud,0),
		ISNULL(Telefono,''), 
		ISNULL(CalificacionPromedio,0), 
		Activo
	FROM Restaurante
	WHERE Activo = 1
`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var restaurants []Restaurant

	for rows.Next() {
		var rest Restaurant

		err := rows.Scan(
			&rest.Id,
			&rest.Nombre,
			&rest.Direccion,
			&rest.Latitud,
			&rest.Longitud,
			&rest.Telefono,
			&rest.Calificacion,
			&rest.Activo,
		)
		if err != nil {
			return nil, err
		}

		restaurants = append(restaurants, rest)
	}

	return restaurants, nil

}
