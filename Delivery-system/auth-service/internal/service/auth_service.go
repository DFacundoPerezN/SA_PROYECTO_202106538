package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"auth-service/internal/grpc"
	"auth-service/internal/jwt"
	passwordlib "auth-service/internal/password"

	grpcCodes "google.golang.org/grpc/codes"
	grpcStatus "google.golang.org/grpc/status"
)

var (
	ErrInvalidCredentials    = errors.New("invalid credentials")
	ErrUserServiceUnavailable = errors.New("user service unavailable")
)

type LoginResult struct {
	UserID         int32
	Email          string
	Token          string
	Role           string
	NombreCompleto string
	Telefono       string
}

type AuthService struct {
	userClient *grpc.UserClient
	jwtManager *jwt.JWTManager
}

func NewAuthService(userClient *grpc.UserClient, jwtManager *jwt.JWTManager) *AuthService {
	return &AuthService{
		userClient: userClient,
		jwtManager: jwtManager,
	}
}

func (s *AuthService) Login(ctx context.Context, email string, password string) (*LoginResult, error) {

	user, err := s.userClient.GetUserByEmail(ctx, email)
	if err != nil {
		if isUserNotFoundError(err) {
			return nil, ErrInvalidCredentials
		}

		return nil, fmt.Errorf("%w: %v", ErrUserServiceUnavailable, err)
	}

	resultPas := passwordlib.CheckPasswordHash(password, user.Password)
	if !resultPas {
		return nil, ErrInvalidCredentials
	}

	token, err := s.jwtManager.GenerateToken(user.Id, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return &LoginResult{
		Token:          token,
		UserID:         user.Id,
		Email:          user.Email,
		Role:           user.Role,
		NombreCompleto: user.NombreCompleto,
	}, nil
}

func (s *AuthService) ValidateToken(token string) (*jwt.Claims, error) {

	claims, err := s.jwtManager.VerifyToken(token)
	if err != nil {
		return nil, err
	}

	return claims, nil
}

func isUserNotFoundError(err error) bool {
	if err == nil {
		return false
	}

	if grpcStatus.Code(err) == grpcCodes.NotFound {
		return true
	}

	return strings.Contains(strings.ToLower(err.Error()), "user not found")
}
