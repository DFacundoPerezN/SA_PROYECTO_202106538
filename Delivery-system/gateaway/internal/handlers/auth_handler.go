package handlers

import (
	"net/http"

	"api-gateway/internal/grpc"

	"github.com/gin-gonic/gin"
	grpcCodes "google.golang.org/grpc/codes"
	grpcStatus "google.golang.org/grpc/status"
)

type AuthHandler struct {
	authClient *grpc.AuthClient
	userClient *grpc.UserClient
}

func NewAuthHandler(authClient *grpc.AuthClient, userClient *grpc.UserClient) *AuthHandler {
	return &AuthHandler{authClient: authClient, userClient: userClient}
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	resp, err := h.authClient.Login(req.Email, req.Password)

	if err != nil {
		if status, ok := grpcStatus.FromError(err); ok {
			switch status.Code() {
			case grpcCodes.Unauthenticated:
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Credenciales inválidas"})
			case grpcCodes.Unavailable:
				c.JSON(http.StatusServiceUnavailable, gin.H{"error": "El servicio de autenticación no está disponible"})
			default:
				c.JSON(http.StatusBadGateway, gin.H{"error": "No se pudo completar el inicio de sesión"})
			}
			return
		}

		c.JSON(http.StatusBadGateway, gin.H{"error": "No se pudo completar el inicio de sesión"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": resp.Token,
		"email": resp.Email,
		"role":  resp.Role,
		"name":  resp.NombreCompleto,
		"id":    resp.UserId,
	})
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	Role     string `json:"role"`
}

func (h *AuthHandler) Register(c *gin.Context) {
	var req RegisterRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid body"})
		return
	}

	resp, err := h.userClient.Register(
		req.Email,
		req.Password,
		req.Name,
		req.Role,
	)

	if err != nil {
		if status, ok := grpcStatus.FromError(err); ok {
			switch status.Code() {
			case grpcCodes.InvalidArgument:
				c.JSON(http.StatusBadRequest, gin.H{"error": status.Message()})
			case grpcCodes.AlreadyExists:
				c.JSON(http.StatusConflict, gin.H{"error": status.Message()})
			case grpcCodes.Unavailable:
				c.JSON(http.StatusServiceUnavailable, gin.H{"error": "El servicio de usuarios no está disponible"})
			default:
				c.JSON(http.StatusBadGateway, gin.H{"error": "No se pudo completar el registro"})
			}
			return
		}

		c.JSON(http.StatusBadGateway, gin.H{"error": "No se pudo completar el registro"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":    resp.UserId,
		"email": resp.Email,
	})
}
