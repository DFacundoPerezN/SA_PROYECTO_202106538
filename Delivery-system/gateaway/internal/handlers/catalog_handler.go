package handlers

import (
	"delivery-proto/catalogpb"
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

type CreateProductBody struct {
	Nombre        string  `json:"nombre"`
	Descripcion   string  `json:"descripcion"`
	RestauranteId int32   `json:"restaurante_id"`
	Precio        float64 `json:"precio"`
	Categoria     string  `json:"categoria"`
}

func (h *CatalogHandler) CreateProduct(c *gin.Context) {

	var body CreateProductBody

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.client.CreateProduct(
		c.Request.Context(),
		&catalogpb.CreateProductRequest{
			Nombre:        body.Nombre,
			Descripcion:   body.Descripcion,
			RestauranteId: body.RestauranteId,
			Precio:        body.Precio,
			Categoria:     body.Categoria,
		},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, resp)
}
