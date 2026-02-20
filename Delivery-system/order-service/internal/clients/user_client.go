package grpcclient

import (
	"context"
	"time"

	userpb "delivery-proto/userpb"

	"google.golang.org/grpc"
)

type UserClient struct {
	client userpb.UserServiceClient
}

func NewUserClient(addr string) (*UserClient, error) {

	conn, err := grpc.Dial(addr, grpc.WithInsecure())
	if err != nil {
		return nil, err
	}

	c := userpb.NewUserServiceClient(conn)

	return &UserClient{client: c}, nil
}

func (u *UserClient) GetUserByID(id int32) (*userpb.GetUserByIDResponse, error) {

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return u.client.GetUserByID(ctx, &userpb.GetUserByIDRequest{
		Id: id,
	})
}
