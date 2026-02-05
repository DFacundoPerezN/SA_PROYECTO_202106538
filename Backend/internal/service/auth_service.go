package service

import (
	"errors"
	"time"

	"Backend/internal/domain"
	"Backend/internal/pkg/jwt"
	"Backend/internal/pkg/password"
)

type AuthService struct {
	userService *UserService
	jwtManager  *jwt.JWTManager
}

func NewAuthService(userService *UserService, jwtManager *jwt.JWTManager) *AuthService {
	return &AuthService{
		userService: userService,
		jwtManager:  jwtManager,
	}
}

func (s *AuthService) Login(req domain.LoginRequest) (*domain.LoginResponse, error) {
	// Get user by email
	user, err := s.userService.GetUserByEmail(req.Email)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Verify password
	if !password.CheckPasswordHash(req.Password, user.PasswordHash) {
		return nil, errors.New("invalid credentials")
	}

	// Generate JWT token
	token, err := s.jwtManager.GenerateToken(user.ID, user.Email, user.Role)
	if err != nil {
		return nil, err
	}

	// Clear sensitive data
	user.PasswordHash = ""

	response := &domain.LoginResponse{
		Token: token,
		User:  *user,
	}

	return response, nil
}

func (s *AuthService) ValidateToken(tokenString string) (*jwt.Claims, error) {
	claims, err := s.jwtManager.VerifyToken(tokenString)
	if err != nil {
		return nil, err
	}

	// Check if token is expired
	if time.Now().After(claims.ExpiresAt.Time) {
		return nil, errors.New("token expired")
	}

	return claims, nil
}
