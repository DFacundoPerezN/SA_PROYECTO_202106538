package grpcclient

import (
	"context"
	"time"

	authpb "auth-service/proto"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

type AuthClient struct {
	client authpb.AuthServiceClient
}

func NewAuthClient(address string) (*AuthClient, error) {
	conn, err := grpc.Dial(address,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, err
	}

	client := authpb.NewAuthServiceClient(conn)

	return &AuthClient{client: client}, nil
}

func (a *AuthClient) ValidateToken(token string) (*authpb.ValidateTokenResponse, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	return a.client.ValidateToken(ctx, &authpb.ValidateTokenRequest{
		Token: token,
	})
}
