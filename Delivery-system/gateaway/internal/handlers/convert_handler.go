package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	convertclient "api-gateway/internal/grpc"
)

type ConvertHandler struct {
	client *convertclient.ConvertClient
}

func NewConvertHandler(c *convertclient.ConvertClient) *ConvertHandler {
	return &ConvertHandler{client: c}
}

// GET /convert/exchange-rate?from=USD&to=GTQ
func (h *ConvertHandler) GetExchangeRate(c *gin.Context) {

	fromCurrency := c.Query("from")
	toCurrency := c.Query("to")

	if fromCurrency == "" || toCurrency == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "missing required query parameters: from and to",
		})
		return
	}

	rate, err := h.client.GetExchangeRate(c.Request.Context(), fromCurrency, toCurrency)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, rate)
}

type ConvertCurrencyBody struct {
	FromCurrency string  `json:"from_currency"`
	ToCurrency   string  `json:"to_currency"`
	Amount       float64 `json:"amount"`
}

// POST /convert/currency
func (h *ConvertHandler) ConvertCurrency(c *gin.Context) {

	var body ConvertCurrencyBody

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if body.FromCurrency == "" || body.ToCurrency == "" || body.Amount <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid request: from_currency, to_currency and amount (> 0) are required",
		})
		return
	}

	converted, err := h.client.ConvertCurrency(
		c.Request.Context(),
		body.FromCurrency,
		body.ToCurrency,
		body.Amount,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, converted)
}
