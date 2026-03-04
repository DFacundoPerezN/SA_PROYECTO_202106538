package grpc

import (
	"context"
	"strings"

	"convert-service/internal/service"

	convertpb "delivery-proto/convertpb"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type ConvertGRPCServer struct {
	convertpb.UnimplementedConvertServiceServer
	convertService service.ConvertService
}

func NewConvertGRPCServer(convertService service.ConvertService) *ConvertGRPCServer {
	return &ConvertGRPCServer{
		convertService: convertService,
	}
}

func (s *ConvertGRPCServer) GetExchangeRate(ctx context.Context, req *convertpb.GetExchangeRateRequest) (*convertpb.GetExchangeRateResponse, error) {
	if strings.TrimSpace(req.FromCurrency) == "" || strings.TrimSpace(req.ToCurrency) == "" {
		return nil, status.Error(codes.InvalidArgument, "from_currency and to_currency are required")
	}

	rate, err := s.convertService.GetExchangeRate(ctx, req.FromCurrency, req.ToCurrency)
	if err != nil {
		return nil, err
	}

	return &convertpb.GetExchangeRateResponse{
		FromCurrency: rate.FromCurrency,
		ToCurrency:   rate.ToCurrency,
		Rate:         rate.Rate,
		Timestamp:    rate.Timestamp.Unix(),
		Source:       rate.Source,
	}, nil
}

func (s *ConvertGRPCServer) ConvertCurrency(ctx context.Context, req *convertpb.ConvertCurrencyRequest) (*convertpb.ConvertCurrencyResponse, error) {
	if strings.TrimSpace(req.FromCurrency) == "" || strings.TrimSpace(req.ToCurrency) == "" {
		return nil, status.Error(codes.InvalidArgument, "from_currency and to_currency are required")
	}

	if req.Amount <= 0 {
		return nil, status.Error(codes.InvalidArgument, "amount must be greater than 0")
	}

	convertedAmount, rate, err := s.convertService.ConvertCurrency(ctx, req.FromCurrency, req.ToCurrency, req.Amount)
	if err != nil {
		return nil, err
	}

	return &convertpb.ConvertCurrencyResponse{
		FromCurrency: rate.FromCurrency,
		ToCurrency:   rate.ToCurrency,
		AmountFrom:   req.Amount,
		AmountTo:     convertedAmount,
		Rate:         rate.Rate,
		Timestamp:    rate.Timestamp.Unix(),
		Source:       rate.Source,
	}, nil
}
