package grpc

import (
	"context"

	paymentpb "delivery-proto/paymentpb"
	"payment-service/internal/service"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type PaymentGRPCServer struct {
	paymentpb.UnimplementedPaymentServiceServer
	paymentService *service.PaymentService
}

func NewPaymentGRPCServer(paymentService *service.PaymentService) *PaymentGRPCServer {
	return &PaymentGRPCServer{paymentService: paymentService}
}

func (s *PaymentGRPCServer) ProcessPayment(
	ctx context.Context,
	req *paymentpb.ProcessPaymentRequest,
) (*paymentpb.ProcessPaymentResponse, error) {

	if req.OrderId <= 0 {
		return nil, status.Errorf(
			codes.InvalidArgument,
			"order_id inválido (%d): la orden aún no fue procesada por el sistema, espere unos segundos y vuelva a intentarlo",
			req.OrderId,
		)
	}

	if req.ClientId <= 0 {
		return nil, status.Errorf(codes.InvalidArgument, "client_id inválido (%d)", req.ClientId)
	}

	result, err := s.paymentService.ProcessPaymentRequest(
		ctx,
		int(req.OrderId),
		req.PaymentMethod,
		req.UseCupon,
		int(req.ClientId),
		req.Amount,
	)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "error procesando el pago: %v", err)
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
		return nil, status.Errorf(codes.Internal, "error obteniendo pagos: %v", err)
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