package grpc

import (
	"context"
	"time"

	convertpb "delivery-proto/convertpb"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type ConvertClient struct {
	client convertpb.ConvertServiceClient
}

func NewConvertClient(address string) (*ConvertClient, error) {

	conn, err := grpc.Dial(address, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, err
	}

	return &ConvertClient{
		client: convertpb.NewConvertServiceClient(conn),
	}, nil
}

func (c *ConvertClient) GetExchangeRate(
	ctx context.Context,
	fromCurrency string,
	toCurrency string,
) (*convertpb.GetExchangeRateResponse, error) {

	ctxWithTimeout, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return c.client.GetExchangeRate(ctxWithTimeout, &convertpb.GetExchangeRateRequest{
		FromCurrency: fromCurrency,
		ToCurrency:   toCurrency,
	})
}

func (c *ConvertClient) ConvertCurrency(
	ctx context.Context,
	fromCurrency string,
	toCurrency string,
	amount float64,
) (*convertpb.ConvertCurrencyResponse, error) {

	ctxWithTimeout, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	return c.client.ConvertCurrency(ctxWithTimeout, &convertpb.ConvertCurrencyRequest{
		FromCurrency: fromCurrency,
		ToCurrency:   toCurrency,
		Amount:       amount,
	})
}
