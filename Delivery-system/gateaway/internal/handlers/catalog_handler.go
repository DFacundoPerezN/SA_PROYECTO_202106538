package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	catalogclient "api-gateway/internal/grpc"
)

type CatalogHandler struct {
	client *catalogclient.CatalogClient
}

func NewCatalogHandler(c *catalogclient.CatalogClient) *CatalogHandler {
	return &CatalogHandler{client: c}
}

// GET /restaurants/:id/products
func (h *CatalogHandler) GetProductsByRestaurant(c *gin.Context) {

	idParam := c.Param("id")

	restaurantID, err := strconv.Atoi(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "invalid restaurant id",
		})
		return
	}

	products, err := h.client.GetCatalog(int32(restaurantID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, products)

}
