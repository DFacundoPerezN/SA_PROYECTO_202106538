package domain

import "time"

type User struct {
	ID             int       `json:"id"`
	Email          string    `json:"email"`
	PasswordHash   string    `json:"-"`
	Role           string    `json:"role"`
	NombreCompleto string    `json:"nombre_completo"`
	Telefono       *string   `json:"telefono,omitempty"`
	FechaRegistro  time.Time `json:"fecha_registro"`
}

type CreateUserRequest struct {
	Email          string `json:"email" binding:"required,email"`
	Password       string `json:"password" binding:"required,min=7"`
	Role           string `json:"role" binding:"required,oneof=CLIENTE RESTAURANTE REPARTIDOR ADMINISTRADOR"`
	NombreCompleto string `json:"nombre_completo" binding:"required"`
	Telefono       string `json:"telefono,omitempty"`
}

type UpdateUserRequest struct {
	Email          string `json:"email,omitempty"`
	NombreCompleto string `json:"nombre_completo,omitempty"`
	Telefono       string `json:"telefono,omitempty"`
}

type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type LoginResult struct {
	UserID         int32
	Email          string
	Token          string
	Role           string
	NombreCompleto string
}

type UserRepository interface {
	Create(user *User) error
	FindByID(id int) (*User, error)
	FindByEmail(email string) (*User, error)
	Update(user *User) error
	Delete(id int) error
	FindAll(limit, offset int) ([]User, error)
	Count() (int, error)
}
