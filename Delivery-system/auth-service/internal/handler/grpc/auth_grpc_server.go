package grpc

import (
	"context"
	"errors"
	"log"

	"auth-service/internal/service"
	authpb "auth-service/proto"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type AuthGRPCServer struct {
	authpb.UnimplementedAuthServiceServer
	authService *service.AuthService
}

func NewAuthGRPCServer(authService *service.AuthService) *AuthGRPCServer {
	return &AuthGRPCServer{authService: authService}
}

func (s *AuthGRPCServer) Login(ctx context.Context, req *authpb.LoginRequest) (*authpb.LoginResponse, error) {

	result, err := s.authService.Login(ctx, req.Email, req.Password)
	if err != nil {
		log.Printf("[auth-service][Login] email=%s error=%v", req.Email, err)

		switch {
		case errors.Is(err, service.ErrInvalidCredentials):
			return nil, status.Error(codes.Unauthenticated, "invalid credentials")
		case errors.Is(err, service.ErrUserServiceUnavailable):
			return nil, status.Error(codes.Unavailable, "authentication backend unavailable")
		default:
			return nil, status.Error(codes.Internal, "internal authentication error")
		}
	}

	return &authpb.LoginResponse{
		UserId:         result.UserID,
		Email:          result.Email,
		Token:          result.Token,
		Role:           result.Role,
		NombreCompleto: result.NombreCompleto,
	}, nil
}

func (s *AuthGRPCServer) ValidateToken(ctx context.Context, req *authpb.ValidateTokenRequest) (*authpb.ValidateTokenResponse, error) {

	claims, err := s.authService.ValidateToken(req.Token)
	if err != nil {
		return nil, err
	}

	return &authpb.ValidateTokenResponse{
		UserId: claims.UserID,
		Email:  claims.Email,
		Rol:    claims.Role,
	}, nil
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
