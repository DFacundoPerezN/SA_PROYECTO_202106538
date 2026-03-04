package service

import (
	"context"
	"payment-service/internal/domain"
	"payment-service/internal/repository"
)

type PaymentService struct {
	repo *repository.PaymentRepository
	//userClient *grpcclient.UserClient
}

func NewPaymentService(repo *repository.PaymentRepository) *PaymentService {
	return &PaymentService{repo: repo}
}

func (s *PaymentService) ProcessPaymentRequest(ctx context.Context, orderID int, paymentMethod string, useCupon bool, clientID int) (int, error) {

	domainPayment := domain.Payment{
		OrdenId:     orderID,
		ClienteId:   clientID,
		PrecioFinal: 0.0, // Aquí podrías calcular el precio final basado en el pedido, cupones, etc.
		UsaCupon:    useCupon,
		MetodoPago:  paymentMethod,
	}

	return s.repo.CreatePayment(ctx, &domainPayment)
}
