package service

import (
	"context"
	"user-service/internal/domain"
)

func (s *UserService) CreateDriverRating(
	ctx context.Context,
	clienteID int,
	repartidorID int,
	estrellas int,
	comentario string,
) (int, error) {

	rating := domain.DriverRating{
		ClienteId:    clienteID,
		RepartidorId: repartidorID,
		Estrellas:    estrellas,
		Comentario:   comentario,
	}

	return s.userRepo.CreateDriverRating(ctx, &rating)
}

func (s *UserService) GetDriverRatingAverage(ctx context.Context, driverID int) (float64, int, error) {
	return s.userRepo.GetDriverRatingAverage(ctx, driverID)
}
