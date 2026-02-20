package grpc

import (
	"context"

	"user-service/internal/domain"
	"user-service/internal/service"

	userpb "delivery-proto/userpb" //userpb "delivery-proto/userpb"
)

type UserGRPCServer struct {
	userpb.UnimplementedUserServiceServer
	userService *service.UserService
}

func NewUserGRPCServer(userService *service.UserService) *UserGRPCServer {
	return &UserGRPCServer{userService: userService}
}

func (s *UserGRPCServer) GetUserByEmail(ctx context.Context, req *userpb.GetUserByEmailRequest) (*userpb.UserResponse, error) {

	user, err := s.userService.GetUserByEmail(req.Email)
	if err != nil {
		return nil, err
	}

	return &userpb.UserResponse{
		User: &userpb.User{
			Id:             int32(user.ID),
			Email:          user.Email,
			Password:       user.PasswordHash,
			NombreCompleto: user.NombreCompleto,
			Role:           user.Role,
		},
	}, nil
}

func (s *UserGRPCServer) GetUserByID(ctx context.Context, req *userpb.GetUserByIDRequest) (*userpb.UserResponse, error) {

	user, err := s.userService.GetUserByID(int(req.Id))
	if err != nil {
		return nil, err
	}

	return &userpb.UserResponse{
		User: &userpb.User{
			Id:             int32(user.ID),
			Email:          user.Email,
			Password:       user.PasswordHash,
			NombreCompleto: user.NombreCompleto,
			Role:           user.Role,
		},
	}, nil
}

func (s *UserGRPCServer) CreateUser(ctx context.Context, req *userpb.CreateUserRequest) (*userpb.CreateUserResponse, error) {

	if req.Rol == "" {
		req.Rol = "CLIENTE" // Asignar rol por defecto si no se proporciona
	}

	user, err := s.userService.CreateUser(domain.CreateUserRequest{
		Email:          req.Email,
		Password:       req.Password,
		NombreCompleto: req.NombreCompleto,
		Role:           req.Rol, // Por defecto, asignamos el rol de CLIENTE
	})
	if err != nil {
		return nil, err
	}

	return &userpb.CreateUserResponse{
		UserId:         int64(user.ID),
		Email:          user.Email,
		NombreCompleto: user.NombreCompleto,
	}, nil
}
