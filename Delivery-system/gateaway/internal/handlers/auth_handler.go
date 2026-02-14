package handlers

import (
	"net/http"

	"api-gateway/internal/grpc"

	"github.com/gin-gonic/gin"
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
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": resp.Token,
		"email": resp.Email,
		"role":  resp.Role,
		"name":  resp.NombreCompleto,
	})
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
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
	)

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"id":    resp.UserId,
		"email": resp.Email,
	})
}
