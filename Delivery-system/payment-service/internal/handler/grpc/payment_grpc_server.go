package grpc

import (
	"context"
	paymentpb "delivery-proto/paymentpb"
	"payment-service/internal/service"
)

type PaymentGRPCServer struct {
	paymentpb.UnimplementedPaymentServiceServer
	paymentService *service.PaymentService
}

func NewPaymentGRPCServer(paymentService *service.PaymentService) *PaymentGRPCServer {
	return &PaymentGRPCServer{paymentService: paymentService}
}

func (s *PaymentGRPCServer) ProcessPayment(ctx context.Context, req *paymentpb.ProcessPaymentRequest) (*paymentpb.ProcessPaymentResponse, error) {

	result, err := s.paymentService.ProcessPaymentRequest(
		ctx,
		int(req.OrderId),
		//req.Amount,
		req.PaymentMethod,
		req.UseCupon,
		int(req.ClientId),
	)
	if err != nil {
		return nil, err
	}
	return &paymentpb.ProcessPaymentResponse{
		PaymentId: int32(result),
		Status:    "PAGADO",
		Message:   "Pago procesado exitosamente",
	}, nil
}
