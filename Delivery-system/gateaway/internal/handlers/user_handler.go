package handlers

import (
	"delivery-proto/userpb"
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

func (h *UserHandler) CreateRating(c *gin.Context) {

	clientID := c.GetInt("user_id")

	var req struct {
		DriverID int32  `json:"driver_id"`
		Stars    int32  `json:"stars"`
		Comment  string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "body inválido"})
		return
	}

	resp, err := h.userClient.CreateDriverRating(
		//context.Background(),
		&userpb.CreateDriverRatingRequest{
			ClienteId:    int32(clientID),
			RepartidorId: req.DriverID,
			Estrellas:    req.Stars,
			Comentario:   req.Comment,
		},
	)

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp)
}

func (h *UserHandler) GetRatingAverage(c *gin.Context) {

	driverID, _ := strconv.Atoi(c.Param("id"))

	resp, err := h.userClient.GetDriverRatingAverage(
		//context.Background(),
		&userpb.GetDriverRatingAverageRequest{
			RepartidorId: int32(driverID),
		},
	)

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp)
}
