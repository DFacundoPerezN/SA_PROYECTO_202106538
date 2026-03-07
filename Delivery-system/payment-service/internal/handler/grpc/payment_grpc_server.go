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

func (s *PaymentGRPCServer) RefundPayment(
	ctx context.Context,
	req *paymentpb.RefundPaymentRequest,
) (*paymentpb.RefundPaymentResponse, error) {

	err := s.paymentService.RefundPayment(ctx, int(req.OrderId))
	if err != nil {
		return &paymentpb.RefundPaymentResponse{
			Success: false,
			Message: err.Error(),
		}, nil
	}

	return &paymentpb.RefundPaymentResponse{
		Success: true,
		Message: "Pago reembolsado correctamente",
	}, nil
}

func (s *PaymentGRPCServer) GetPayments(
	ctx context.Context,
	req *paymentpb.GetPaymentsRequest,
) (*paymentpb.GetPaymentsResponse, error) {

	payments, err := s.paymentService.GetPayments(ctx, int(req.ClientId))
	if err != nil {
		return nil, err
	}

	var response []*paymentpb.Payment

	for _, p := range payments {

		response = append(response, &paymentpb.Payment{
			Id:          int32(p.Id),
			OrderId:     int32(p.OrdenId),
			ClientId:    int32(p.ClienteId),
			PrecioFinal: p.PrecioFinal,
			Estado:      p.Estado,
			UsaCupon:    p.UsaCupon,
			MetodoPago:  p.MetodoPago,
			Moneda:      p.Moneda,
		})
	}

	return &paymentpb.GetPaymentsResponse{
		Payments: response,
	}, nil
}
