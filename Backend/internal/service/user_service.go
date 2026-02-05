package service

import (
	"errors"
	"time"

	"Backend/internal/domain"
	"Backend/internal/pkg/password"
)

type UserService struct {
	userRepo domain.UserRepository
}

func NewUserService(userRepo domain.UserRepository) *UserService {
	return &UserService{userRepo: userRepo}
}

func (s *UserService) CreateUser(req domain.CreateUserRequest) (*domain.User, error) {
	// Check if user already exists
	existingUser, err := s.userRepo.FindByEmail(req.Email)
	if err != nil {
		return nil, err
	}
	if existingUser != nil {
		return nil, errors.New("user with this email already exists")
	}

	// Hash password
	hashedPassword, err := password.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// Create user
	user := &domain.User{
		Email:          req.Email,
		PasswordHash:   hashedPassword,
		Role:           req.Role,
		NombreCompleto: req.NombreCompleto,
		FechaRegistro:  time.Now(),
	}

	if req.Telefono != "" {
		user.Telefono = &req.Telefono
	}

	err = s.userRepo.Create(user)
	if err != nil {
		return nil, err
	}

	// Clear password hash for response
	user.PasswordHash = ""
	return user, nil
}

func (s *UserService) GetUserByID(id int) (*domain.User, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	// Clear sensitive data
	user.PasswordHash = ""
	return user, nil
}

func (s *UserService) GetUserByEmail(email string) (*domain.User, error) {
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	return user, nil
}

func (s *UserService) UpdateUser(id int, req domain.UpdateUserRequest) (*domain.User, error) {
	user, err := s.userRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	// Update fields if provided
	if req.Email != "" {
		user.Email = req.Email
	}
	if req.NombreCompleto != "" {
		user.NombreCompleto = req.NombreCompleto
	}
	if req.Telefono != "" {
		user.Telefono = &req.Telefono
	}

	err = s.userRepo.Update(user)
	if err != nil {
		return nil, err
	}

	// Clear sensitive data
	user.PasswordHash = ""
	return user, nil
}

func (s *UserService) DeleteUser(id int) error {
	return s.userRepo.Delete(id)
}

func (s *UserService) GetAllUsers(page, pageSize int) ([]domain.User, int, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	offset := (page - 1) * pageSize

	users, err := s.userRepo.FindAll(pageSize, offset)
	if err != nil {
		return nil, 0, err
	}

	total, err := s.userRepo.Count()
	if err != nil {
		return nil, 0, err
	}

	// Clear sensitive data
	for i := range users {
		users[i].PasswordHash = ""
	}

	return users, total, nil
}
