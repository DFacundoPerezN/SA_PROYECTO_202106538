package grpc

import (
	"context"
	"time"

	userpb "delivery-proto/userpb"
)

type UserClient struct {
	client userpb.UserServiceClient
}

func NewUserClient(client userpb.UserServiceClient) *UserClient {
	return &UserClient{client: client}
}

func (u *UserClient) Register(email, password, name string) (*userpb.CreateUserResponse, error) {

	ctx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	return u.client.CreateUser(ctx, &userpb.CreateUserRequest{
		Email:          email,
		Password:       password,
		NombreCompleto: name,
	})
}
