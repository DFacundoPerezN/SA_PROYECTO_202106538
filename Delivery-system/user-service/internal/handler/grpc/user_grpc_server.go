package grpc

import (
	"context"
	"log"

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
		log.Printf("[user-service][GetUserByEmail] email=%s error=%v", req.Email, err)
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
		log.Printf("[user-service][GetUserByID] id=%d error=%v", req.Id, err)
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
		log.Println("[user-service][CreateUser] no se proporcionó rol, asignando 'CLIENTE' por defecto")
		req.Rol = "CLIENTE" // Asignar rol por defecto si no se proporciona
	}

	user, err := s.userService.CreateUser(domain.CreateUserRequest{
		Email:          req.Email,
		Password:       req.Password,
		NombreCompleto: req.NombreCompleto,
		Role:           req.Rol, // Por defecto, asignamos el rol de CLIENTE
	})
	if err != nil {
		log.Printf("[user-service][CreateUser] email=%s role=%s error=%v", req.Email, req.Rol, err)
		return nil, err
	}

	return &userpb.CreateUserResponse{
		UserId:         int64(user.ID),
		Email:          user.Email,
		NombreCompleto: user.NombreCompleto,
	}, nil
}

func (s *UserGRPCServer) ListUsers(ctx context.Context, req *userpb.ListUsersRequest) (*userpb.ListUsersResponse, error) {
	roleFilter := req.RoleFilter
	if roleFilter == "" {
		roleFilter = "CLIENTE" // Filtro por defecto
	}

	users, total, err := s.userService.GetAllUsersByRole(roleFilter, int(req.Page), int(req.PageSize))
	if err != nil {
		log.Printf("[user-service][ListUsers] role=%s page=%d pageSize=%d error=%v", roleFilter, req.Page, req.PageSize, err)
		return nil, err
	}

	var pbUsers []*userpb.User
	for _, user := range users {
		pbUsers = append(pbUsers, &userpb.User{
			Id:             int32(user.ID),
			Email:          user.Email,
			Password:       user.PasswordHash,
			NombreCompleto: user.NombreCompleto,
			Role:           user.Role,
		})
	}

	return &userpb.ListUsersResponse{
		Users:    pbUsers,
		Total:    int32(total),
		Page:     req.Page,
		PageSize: req.PageSize,
	}, nil
}
