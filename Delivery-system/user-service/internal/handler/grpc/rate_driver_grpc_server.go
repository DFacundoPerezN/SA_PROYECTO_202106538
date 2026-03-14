package grpc

import (
	"context"
	userpb "delivery-proto/userpb"
)

func (s *UserGRPCServer) CreateDriverRating(
	ctx context.Context,
	req *userpb.CreateDriverRatingRequest,
) (*userpb.CreateDriverRatingResponse, error) {

	id, err := s.userService.CreateDriverRating(
		ctx,
		int(req.ClienteId),
		int(req.RepartidorId),
		int(req.Estrellas),
		req.Comentario,
	)

	if err != nil {
		return nil, err
	}

	return &userpb.CreateDriverRatingResponse{
		RatingId: int32(id),
		Message:  "Calificación registrada",
	}, nil
}

func (s *UserGRPCServer) GetDriverRatingAverage(
	ctx context.Context,
	req *userpb.GetDriverRatingAverageRequest,
) (*userpb.GetDriverRatingAverageResponse, error) {

	avg, total, err := s.userService.GetDriverRatingAverage(ctx, int(req.RepartidorId))
	if err != nil {
		return nil, err
	}

	return &userpb.GetDriverRatingAverageResponse{
		Promedio:            avg,
		TotalCalificaciones: int32(total),
	}, nil
}

func (s *UserGRPCServer) CreateClientRating(
	ctx context.Context,
	req *userpb.CreateClientRatingRequest,
) (*userpb.CreateClientRatingResponse, error) {

	id, err := s.userService.CreateClientRating(
		ctx,
		int(req.ClienteId),
		int(req.RepartidorId),
		int(req.OrdenId),
		int(req.Estrellas),
		req.Comentario,
	)

	if err != nil {
		return nil, err
	}

	return &userpb.CreateClientRatingResponse{
		RatingId: int32(id),
		Message:  "Calificación registrada",
	}, nil
}

func (s *UserGRPCServer) GetClientRatingAverage(
	ctx context.Context,
	req *userpb.GetClientRatingAverageRequest,
) (*userpb.GetClientRatingAverageResponse, error) {

	avg, total, err := s.userService.GetClientRatingAverage(ctx, int(req.ClienteId))
	if err != nil {
		return nil, err
	}

	return &userpb.GetClientRatingAverageResponse{
		Promedio:            avg,
		TotalCalificaciones: int32(total),
	}, nil
}
