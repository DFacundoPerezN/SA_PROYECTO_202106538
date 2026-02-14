package repository

import "auth-service/internal/domain"

type AuthRepository interface {
	FindByEmail(email string) (*domain.User, error)
}
