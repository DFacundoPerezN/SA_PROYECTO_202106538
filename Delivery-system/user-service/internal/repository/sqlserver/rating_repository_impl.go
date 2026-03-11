package sqlserver

import (
	"context"
	"user-service/internal/domain"
)

func (r *UserRepositoryImpl) CreateDriverRating(ctx context.Context, rating *domain.DriverRating) (int, error) {

	query := `
	INSERT INTO CalificacionRepartidor
	(ClienteId, RepartidorId, Estrellas, Comentario)
	OUTPUT INSERTED.Id
	VALUES (@p1, @p2, @p3, @p4)
	`

	var id int

	err := r.db.QueryRowContext(
		ctx,
		query,
		rating.ClienteId,
		rating.RepartidorId,
		rating.Estrellas,
		rating.Comentario,
	).Scan(&id)

	if err != nil {
		return 0, err
	}

	return id, nil
}

func (r *UserRepositoryImpl) GetDriverRatingAverage(ctx context.Context, driverID int) (float64, int, error) {

	query := `
	SELECT 
		ISNULL(AVG(CAST(Estrellas AS FLOAT)),0),
		COUNT(*)
	FROM CalificacionRepartidor
	WHERE RepartidorId = @p1
	`

	var avg float64
	var total int

	err := r.db.QueryRowContext(ctx, query, driverID).Scan(&avg, &total)

	if err != nil {
		return 0, 0, err
	}

	return avg, total, nil
}
