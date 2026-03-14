package handlers

import (
	"net/http"
	"strconv"

	"api-gateway/internal/grpc"
	orderpb "delivery-proto/orderpb"

	"github.com/gin-gonic/gin"
)

type OrderHandler struct {
	orderClient *grpc.OrderClient
}

func NewOrderHandler(c *grpc.OrderClient) *OrderHandler {
	return &OrderHandler{orderClient: c}
}

type CreateOrderItem struct {
	ProductoId  int32  `json:"producto_id"`
	Cantidad    int32  `json:"cantidad"`
	Comentarios string `json:"comentarios"`
}

type CreateOrderBody struct {
	RestauranteId     int32             `json:"restaurante_id"`
	RestauranteNombre string            `json:"nombre_restaurante"`
	UserID            int32             `json:"cliente_id"`
	UserName          string            `json:"cliente_nombre"`
	UserPhone         string            `json:"cliente_telefono"`
	DireccionEntrega  string            `json:"direccion_entrega"`
	Latitud           float64           `json:"latitud"`
	Longitud          float64           `json:"longitud"`
	Items             []CreateOrderItem `json:"items"`
	MontoDescuento    float64           `json:"monto_descuento"` // ← NUEVO para recibir el descuento calculado en el frontend
}

func (h *OrderHandler) CreateOrder(c *gin.Context) {

	var body CreateOrderBody

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := c.GetInt("user_id")
	
	var items []*orderpb.OrderItem

	for _, i := range body.Items {
		items = append(items, &orderpb.OrderItem{
			ProductId: i.ProductoId,
			Quantity:  i.Cantidad,
			Comments:  i.Comentarios,
		})
	}


	req := &orderpb.CreateOrderRequest{
		ClientId:       int32(userID),
		ClientName:     body.UserName,
		ClientPhone:    body.UserPhone,
		RestaurantId:   body.RestauranteId,
		RestaurantName: body.RestauranteNombre,
		Address:        body.DireccionEntrega,
		Lat:            body.Latitud,
		Lng:            body.Longitud,
		Items:          items,
		DiscountAmount: body.MontoDescuento, // ← PASAR el monto del descuento al backend
	}

	resp, err := h.orderClient.CreateOrder(req)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp)
}

func (h *OrderHandler) UpdateStatus(c *gin.Context) {

	var body struct {
		Status string `json:"status"`
	}

	orderIDParam := c.Param("id")
	orderID, _ := strconv.Atoi(orderIDParam)

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.orderClient.UpdateOrderStatus(int32(orderID), body.Status)
	if err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp)
}

type CancelOrderBody struct {
	Motivo string `json:"motivo" binding:"required"`
}

func (h *OrderHandler) CancelOrder(c *gin.Context) {

	// 1️ obtener order id de la URL
	idParam := c.Param("id")
	orderID64, err := strconv.ParseInt(idParam, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}

	// 2️ obtener usuario autenticado
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "user not authenticated"})
		return
	}

	userID := int32(userIDValue.(int))

	// 3️ body
	var body CancelOrderBody
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 4️ llamar gRPC
	resp, err := h.orderClient.CancelOrder(
		c.Request.Context(),
		int32(orderID64),
		userID,
		body.Motivo,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	// 5. respuesta
	c.JSON(http.StatusOK, gin.H{
		"order_id": resp.OrderId,
		"status":   resp.NewStatus,
		//"message":  resp.NewStatus + " por el usuario " + strconv.Itoa(int(resp.CancelledBy)),
	})
}

func (h *OrderHandler) GetMyOrders(c *gin.Context) {

	userID := c.GetInt("user_id")

	resp, err := h.orderClient.GetOrdersByClient(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp.Orders)
}

func (h *OrderHandler) GetRestaurantOrders(c *gin.Context) {

	idParam := c.Param("id")
	restaurantID, _ := strconv.Atoi(idParam)

	resp, err := h.orderClient.GetOrdersByRestaurant(restaurantID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp.Orders)
}

func (h *OrderHandler) AssignDriver(c *gin.Context) {

	driverID := c.GetInt("user_id")

	orderID, _ := strconv.Atoi(c.Param("id"))

	resp, err := h.orderClient.AssignDriver(orderID, driverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *OrderHandler) GetAvailableOrders(c *gin.Context) {

	resp, err := h.orderClient.GetFinishedOrders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp.Orders)
}

func (h *OrderHandler) GetDeliveredOrders(c *gin.Context) {

	resp, err := h.orderClient.GetDeliveredOrders()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	targetUserID := 0
	role, _ := c.Get("role")

	if role == "CLIENTE" {
		targetUserID = c.GetInt("user_id")
	} else {
		selectedUserID := c.Query("user_id")
		if selectedUserID == "" {
			selectedUserID = c.Query("client_id")
		}

		if selectedUserID != "" {
			parsedUserID, parseErr := strconv.Atoi(selectedUserID)
			if parseErr != nil || parsedUserID <= 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "user_id/client_id invalido"})
				return
			}
			targetUserID = parsedUserID
		}
	}

	if targetUserID == 0 {
		c.JSON(http.StatusOK, resp.Orders)
		return
	}

	filteredOrders := make([]*orderpb.OrderSummary, 0)
	for _, order := range resp.Orders {
		if int(order.ClienteId) == targetUserID {
			filteredOrders = append(filteredOrders, order)
		}
	}

	c.JSON(http.StatusOK, filteredOrders)
}

func (h *OrderHandler) GetMyDriverOrders(c *gin.Context) {

	driverID := c.GetInt("user_id") // viene del middleware

	resp, err := h.orderClient.GetOrdersByDriver(int32(driverID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp.Orders)
}

func (h *OrderHandler) AddOrderImage(context *gin.Context) {

	orderIDParam := context.Param("id")
	orderID, _ := strconv.Atoi(orderIDParam)
	var body struct {
		ImageURL string `json:"image_url"`
	}

	if err := context.ShouldBindJSON(&body); err != nil {
		context.JSON(400, gin.H{"error": "Body inválido"})
		return
	}

	resp, err := h.orderClient.AddOrderImage(int32(orderID), body.ImageURL)
	if err != nil {
		context.JSON(500, gin.H{"error": err.Error()})
		return
	}

	context.JSON(200, resp)
}

func (h *OrderHandler) GetOrderImage(context *gin.Context) {

	orderIDParam := context.Param("id")
	orderID, err := strconv.Atoi(orderIDParam)
	if err != nil {
		context.JSON(400, gin.H{"error": "ID inválido / Invalid order ID"})
		return
	}

	resp, err := h.orderClient.GetOrderImage(int32(orderID))
	if err != nil {
		context.JSON(500, gin.H{"error": err.Error()})
		return
	}
	context.JSON(200, resp)
}

func (h *OrderHandler) GetCancelledOrRejectedOrders(c *gin.Context) {

	resp, err := h.orderClient.GetCancelledOrRejectedOrders()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, resp.Orders)
}

func (h *OrderHandler) GetTopRestaurantsByOrders(c *gin.Context) {

	limitStr := c.DefaultQuery("n", "7")
	limit, _ := strconv.Atoi(limitStr)

	resp, err := h.orderClient.GetTopRestaurantsByOrders(limit)

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp.Restaurants)
}
