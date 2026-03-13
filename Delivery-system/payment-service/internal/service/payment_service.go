package service

import (
	"context"
	"fmt"
	"payment-service/internal/domain"
	"payment-service/internal/repository"
)

type PaymentService struct {
	repo *repository.PaymentRepository
}

func NewPaymentService(repo *repository.PaymentRepository) *PaymentService {
	return &PaymentService{repo: repo}
}

func (s *PaymentService) ProcessPaymentRequest(
	ctx context.Context,
	orderID int,
	paymentMethod string,
	useCupon bool,
	clientID int,
	amount float64,
) (int, error) {

	// Validar que el orderID sea válido.
	// Cuando la orden fue creada con RabbitMQ el gRPC responde OrderId=0
	// porque el ID real aún no fue asignado por la BD. El cliente debe
	// esperar a que la orden exista antes de intentar pagar.
	if orderID <= 0 {
		return 0, fmt.Errorf("order_id inválido (%d): la orden aún no fue procesada, intente en unos segundos", orderID)
	}

	if clientID <= 0 {
		return 0, fmt.Errorf("client_id inválido (%d)", clientID)
	}

	domainPayment := domain.Payment{
		OrdenId:     orderID,
		ClienteId:   clientID,
		PrecioFinal: amount,
		UsaCupon:    useCupon,
		MetodoPago:  paymentMethod,
	}

	return s.repo.CreatePayment(ctx, &domainPayment)
}

func (s *PaymentService) RefundPayment(ctx context.Context, orderID int) error {
	return s.repo.UpdateStatus(ctx, orderID, "REEMBOLSADO")
}

func (s *PaymentService) GetPayments(ctx context.Context, clientID int) ([]domain.Payment, error) {
	return s.repo.GetPayments(ctx, clientID)
}