package handlers

import (
	"context"
	"net/http"
	"strconv"

	paymentpb "delivery-proto/paymentpb"

	"github.com/gin-gonic/gin"
)

type PaymentHandler struct {
	client paymentpb.PaymentServiceClient
}

func NewPaymentHandler(client paymentpb.PaymentServiceClient) *PaymentHandler {
	return &PaymentHandler{client: client}
}

func (h *PaymentHandler) ProcessPayment(c *gin.Context) {

	ClientID := c.GetInt("user_id")

	var req struct {
		OrderID       int32   `json:"order_id"`
		PaymentMethod string  `json:"payment_method"`
		UseCupon      bool    `json:"use_cupon"`
		Amount        float64 `json:"amount"` // (si decides mantenerlo)
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Body inválido"})
		return
	}

	resp, err := h.client.ProcessPayment(
		context.Background(),
		&paymentpb.ProcessPaymentRequest{
			OrderId: req.OrderID,
			//Amount:        req.Amount,
			PaymentMethod: req.PaymentMethod,
			UseCupon:      req.UseCupon,
			ClientId:      int32(ClientID),
		},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

func (h *PaymentHandler) RefundPayment(c *gin.Context) {

	orderId := c.Param("id")
	orderID, err := strconv.Atoi(orderId)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "ID inválido"})
		return
	}

	resp, err := h.client.RefundPayment(
		context.Background(),
		&paymentpb.RefundPaymentRequest{
			OrderId: int32(orderID),
		},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
