package grpc

import (
	"context"
	"time"

	authpb "delivery-proto/auth"

	"google.golang.org/grpc"
)

type AuthClient struct {
	client authpb.AuthServiceClient
}

func NewAuthClient(address string) (*AuthClient, error) {

	conn, err := grpc.Dial(address, grpc.WithInsecure())
	if err != nil {
		return nil, err
	}

	client := authpb.NewAuthServiceClient(conn)

	return &AuthClient{client: client}, nil
}

func (a *AuthClient) ValidateToken(token string) (*authpb.ValidateTokenResponse, error) {

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	return a.client.ValidateToken(ctx, &authpb.ValidateTokenRequest{
		Token: token,
	})
}

func (a *AuthClient) Login(email, password string) (*authpb.LoginResponse, error) {

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	return a.client.Login(ctx, &authpb.LoginRequest{
		Email:    email,
		Password: password,
	})
}
