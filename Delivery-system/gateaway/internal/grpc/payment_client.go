package grpc

import (
	"context"
	"log"

	paymentpb "delivery-proto/paymentpb"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type PaymentClient struct {
	Client paymentpb.PaymentServiceClient
}

func NewPaymentClient(address string) (*PaymentClient, error) {

	conn, err := grpc.Dial(address,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatalf("No se pudo conectar a payment-service: %v", err)
		return nil, err
	}

	client := paymentpb.NewPaymentServiceClient(conn)

	return &PaymentClient{
		Client: client,
	}, nil
}

func (c *PaymentClient) ProcessPayment(ctx context.Context, orderID int32, paymentMethod string, useCupon bool, clientID int32) (*paymentpb.ProcessPaymentResponse, error) {

	resp, err := c.Client.ProcessPayment(
		ctx,
		&paymentpb.ProcessPaymentRequest{
			OrderId:       orderID,
			PaymentMethod: paymentMethod,
			UseCupon:      useCupon,
			ClientId:      clientID,
		},
	)
	if err != nil {
		log.Printf("Error al procesar el pago: %v", err)
		return nil, err
	}
	return resp, nil
}

func (c *PaymentClient) RefundPayment(
	ctx context.Context,
	orderId int32,
) (*paymentpb.RefundPaymentResponse, error) {

	return c.Client.RefundPayment(
		ctx,
		&paymentpb.RefundPaymentRequest{
			OrderId: orderId,
		},
	)
}

func (c *PaymentClient) GetPayments(ctx context.Context, clientID int32) (*paymentpb.GetPaymentsResponse, error) {

	resp, err := c.Client.GetPayments(
		ctx,
		&paymentpb.GetPaymentsRequest{
			ClientId: clientID,
		},
	)

	if err != nil {
		return nil, err
	}

	return resp, nil
}
