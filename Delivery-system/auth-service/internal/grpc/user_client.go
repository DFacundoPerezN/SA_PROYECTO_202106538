package grpc

import (
	"context"
	"delivery-proto/userpb"
	"time"

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
	client := userpb.NewUserServiceClient(conn)
	return &UserClient{
		client: client,
	}, nil
}

type UserDTO struct {
	Id             int32
	Email          string
	Password       string
	Role           string
	NombreCompleto string
}

func (c *UserClient) GetUserByEmail(ctx context.Context, email string) (*UserDTO, error) {

	res, err := c.client.GetUserByEmail(ctx, &userpb.GetUserByEmailRequest{
		Email: email,
	})
	if err != nil {
		return nil, err
	}

	// OJO: ahora usamos los campos directos
	return &UserDTO{
		Id:       res.User.Id,
		Email:    res.User.Email,
		Role:     res.User.Role,
		Password: res.User.Password,
	}, nil
}

func (c *UserClient) GetUserByID(userID int32) (*userpb.User, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := c.client.GetUserByID(ctx, &userpb.GetUserByIDRequest{
		Id: userID,
	})
	if err != nil {
		return nil, err
	}
	return res.User, nil
}
