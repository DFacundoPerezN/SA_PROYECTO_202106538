package handlers

import (
	"net/http"
	"strconv"

	"api-gateway/internal/grpc"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	userClient *grpc.UserClient
}

func NewUserHandler(userClient *grpc.UserClient) *UserHandler {
	return &UserHandler{userClient: userClient}
}

func (h *UserHandler) ListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	roleFilter := c.DefaultQuery("role", "CLIENTE") // Filtro por defecto: CLIENTE

	users, err := h.userClient.ListUsers(int32(page), int32(pageSize), roleFilter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "failed to list users: " + err.Error(),
		})
		return
	}

	response := gin.H{
		"data": users.Users,
		"pagination": gin.H{
			"page":       users.Page,
			"pageSize":   users.PageSize,
			"total":      users.Total,
			"totalPages": (users.Total + users.PageSize - 1) / users.PageSize,
		},
	}

	c.JSON(http.StatusOK, response)
}
