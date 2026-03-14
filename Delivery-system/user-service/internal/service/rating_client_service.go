package service

import (
	"context"
	"errors"
	"user-service/internal/domain"
)

func (s *UserService) CreateClientRating(
	ctx context.Context,
	clientID int,
	driverID int,
	orderID int,
	estrellas int,
	comentario string,
) (int, error) {
	if estrellas < 1 || estrellas > 5 {
		return 0, errors.New("estrellas debe estar entre 1 y 5")
	}

	rating := domain.ClientRating{
		ClienteId:    clientID,
		RepartidorId: driverID,
		OrdenId:      orderID,
		Estrellas:    estrellas,
		Comentario:   comentario,
	}

	return s.userRepo.CreateClientRating(ctx, &rating)
}

func (s *UserService) GetClientRatingAverage(ctx context.Context, clientID int) (float64, int, error) {
	return s.userRepo.GetClientRatingAverage(ctx, clientID)
}
