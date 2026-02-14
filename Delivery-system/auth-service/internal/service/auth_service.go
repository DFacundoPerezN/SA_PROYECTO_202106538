package service

import (
	"context"
	"errors"

	"auth-service/internal/grpc"
	"auth-service/internal/jwt"
	passwordlib "auth-service/internal/password"
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
		return nil, errors.New("invalid credentials")
	}

	resultPas := passwordlib.CheckPasswordHash(password, user.Password)
	if !resultPas {
		return nil, errors.New("invalid credentials")
	}

	userProfile, err := s.userClient.GetUserByID(user.Id)
	if err != nil {
		return nil, err
	}

	token, err := s.jwtManager.GenerateToken(user.Id, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	return &LoginResult{
		Token:          token,
		UserID:         userProfile.Id,
		Email:          userProfile.Email,
		Role:           userProfile.Role,
		NombreCompleto: userProfile.NombreCompleto,
		//Telefono:       userProfile.Telefono,
	}, nil
}

func (s *AuthService) ValidateToken(token string) (*jwt.Claims, error) {

	claims, err := s.jwtManager.VerifyToken(token)
	if err != nil {
		return nil, err
	}

	return claims, nil
}
