package repository

import (
	"context"
	"database/sql"
	"restaurant-service/internal/domain"
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

func (r *RestaurantRepository) Create(ctx context.Context, rest *domain.Restaurant) error {

	query := `
	INSERT INTO Restaurante (
		Id,
		Nombre,
		Direccion,
		Latitud,
		Longitud,
		Telefono,
		HorarioApertura,
		HorarioCierre
	)
	VALUES (@p1,@p2,@p3,@p4,@p5,@p6,@p7,@p8)
	`

	_, err := r.db.ExecContext(ctx, query,
		rest.ID,
		rest.Nombre,
		rest.Direccion,
		rest.Latitud,
		rest.Longitud,
		rest.Telefono,
		rest.HorarioApertura,
		rest.HorarioCierre,
	)

	return err
}

func (r *RestaurantRepository) Exists(ctx context.Context, userID int) (bool, error) {

	var count int

	err := r.db.QueryRowContext(ctx,
		"SELECT COUNT(1) FROM Restaurante WHERE Id = @p1",
		userID,
	).Scan(&count)

	return count > 0, err
}

func (r *RestaurantRepository) CreateRestaurantRating(
	ctx context.Context,
	rating *domain.RestaurantRating,
) (int, error) {

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}

	query := `
	INSERT INTO CalificacionRestaurante
	(ClienteId, RestauranteId, Estrellas, Comentario)
	OUTPUT INSERTED.Id
	VALUES (@p1, @p2, @p3, @p4)
	`

	var id int

	err = tx.QueryRowContext(
		ctx,
		query,
		rating.ClienteId,
		rating.RestauranteId,
		rating.Estrellas,
		rating.Comentario,
	).Scan(&id)

	if err != nil {
		tx.Rollback()
		return 0, err
	}

	// recalcular promedio
	err = r.UpdateRestaurantAverage(ctx, tx, rating.RestauranteId)
	if err != nil {
		tx.Rollback()
		return 0, err
	}

	tx.Commit()

	return id, nil
}

func (r *RestaurantRepository) UpdateRestaurantAverage(
	ctx context.Context,
	tx *sql.Tx,
	restaurantID int,
) error {

	query := `
	UPDATE Restaurante
	SET CalificacionPromedio = (
		SELECT AVG(CAST(Estrellas AS FLOAT))
		FROM CalificacionRestaurante
		WHERE RestauranteId = @p1
	)
	WHERE Id = @p1
	`

	_, err := tx.ExecContext(ctx, query, restaurantID)

	return err
}

func (r *RestaurantRepository) GetRestaurantRatingAverage(
	ctx context.Context,
	restaurantID int,
) (float64, int, error) {

	query := `
	SELECT 
		ISNULL(AVG(CAST(Estrellas AS FLOAT)),0),
		COUNT(*)
	FROM CalificacionRestaurante
	WHERE RestauranteId = @p1
	`

	var avg float64
	var total int

	err := r.db.QueryRowContext(ctx, query, restaurantID).Scan(&avg, &total)

	if err != nil {
		return 0, 0, err
	}

	return avg, total, nil
}
