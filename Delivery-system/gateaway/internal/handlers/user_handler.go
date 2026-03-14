package handlers

import (
	"api-gateway/internal/grpc"
	"delivery-proto/userpb"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	userClient  *grpc.UserClient
	orderClient *grpc.OrderClient
}

func NewUserHandler(userClient *grpc.UserClient, orderClient *grpc.OrderClient) *UserHandler {
	return &UserHandler{userClient: userClient, orderClient: orderClient}
}

func (h *UserHandler) ListUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	roleFilter := c.Query("role")

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
	if c.GetString("role") != "CLIENTE" {
		c.JSON(http.StatusForbidden, gin.H{"error": "solo clientes pueden calificar repartidores"})
		return
	}

	clientID := c.GetInt("user_id")

	var req struct {
		DriverID int32  `json:"driver_id"`
		Stars    int32  `json:"stars"`
		Comment  string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "body inválido"})
		return
	}

	if req.DriverID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "driver_id inválido"})
		return
	}

	if req.Stars < 1 || req.Stars > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "stars debe estar entre 1 y 5"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *UserHandler) GetRatingAverage(c *gin.Context) {
	driverID, err := strconv.Atoi(c.Param("id"))
	if err != nil || driverID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}

	resp, err := h.userClient.GetDriverRatingAverage(
		&userpb.GetDriverRatingAverageRequest{
			RepartidorId: int32(driverID),
		},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *UserHandler) CreateClientRating(c *gin.Context) {
	if c.GetString("role") != "REPARTIDOR" {
		c.JSON(http.StatusForbidden, gin.H{"error": "solo repartidores pueden calificar clientes"})
		return
	}

	driverID := c.GetInt("user_id")

	var req struct {
		ClientID int32  `json:"client_id"`
		OrderID  int32  `json:"order_id"`
		Stars    int32  `json:"stars"`
		Comment  string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "body inválido"})
		return
	}

	if req.ClientID <= 0 || req.OrderID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "client_id y order_id son obligatorios"})
		return
	}

	if req.Stars < 1 || req.Stars > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "stars debe estar entre 1 y 5"})
		return
	}

	ordersResp, err := h.orderClient.GetOrdersByDriver(int32(driverID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "no se pudieron validar las órdenes del repartidor"})
		return
	}

	isEligibleOrder := false
	for _, order := range ordersResp.Orders {
		if order.Id != req.OrderID {
			continue
		}

		if order.ClienteId != req.ClientID {
			continue
		}

		if strings.ToUpper(strings.TrimSpace(order.Estado)) != "ENTREGADA" {
			continue
		}

		isEligibleOrder = true
		break
	}

	if !isEligibleOrder {
		c.JSON(http.StatusForbidden, gin.H{"error": "solo puedes calificar clientes de órdenes entregadas asignadas a ti"})
		return
	}

	resp, err := h.userClient.CreateClientRating(&userpb.CreateClientRatingRequest{
		ClienteId:    req.ClientID,
		RepartidorId: int32(driverID),
		OrdenId:      req.OrderID,
		Estrellas:    req.Stars,
		Comentario:   req.Comment,
	})

	if err != nil {
		errText := strings.ToLower(err.Error())
		if strings.Contains(errText, "uq_calificacioncliente_ordenid") || strings.Contains(errText, "duplicate") {
			c.JSON(http.StatusConflict, gin.H{"error": "la orden ya tiene una calificación registrada"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *UserHandler) GetClientRatingAverage(c *gin.Context) {
	clientID, err := strconv.Atoi(c.Param("id"))
	if err != nil || clientID <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}

	resp, err := h.userClient.GetClientRatingAverage(&userpb.GetClientRatingAverageRequest{
		ClienteId: int32(clientID),
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
