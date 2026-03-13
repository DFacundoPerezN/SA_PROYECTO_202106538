package handlers

import (
	"context"
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
	Nombre            string  `json:"nombre"`
	Descripcion       string  `json:"descripcion"`
	RestauranteId     int32   `json:"restaurante_id"`
	Precio            float64 `json:"precio"`
	Categoria         string  `json:"categoria"`
	RestauranteNombre string  `json:"restaurante_nombre"`
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
			Nombre:            body.Nombre,
			Descripcion:       body.Descripcion,
			RestauranteId:     body.RestauranteId,
			Precio:            body.Precio,
			Categoria:         body.Categoria,
			RestauranteNombre: body.RestauranteNombre,
		},
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, resp)
}

func (h *CatalogHandler) CreateRecommendation(c *gin.Context) {

	clientID := c.GetInt("user_id")

	var req struct {
		ProductID   int32 `json:"product_id"`
		Recommended bool  `json:"recommended"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "body inválido"})
		return
	}

	resp, err := h.client.CreateProductRecommendation(
		context.Background(),
		&catalogpb.CreateProductRecommendationRequest{
			ClienteId:   int32(clientID),
			ProductoId:  req.ProductID,
			Recomendado: req.Recommended,
		},
	)

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp)
}

func (h *CatalogHandler) GetRecommendationPercentage(c *gin.Context) {

	productID, _ := strconv.Atoi(c.Param("id"))

	resp, err := h.client.GetProductRecommendationPercentage(
		context.Background(),
		&catalogpb.GetProductRecommendationPercentageRequest{
			ProductoId: int32(productID),
		},
	)

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp)
}

func (h *CatalogHandler) GetRestaurantsByCategory(c *gin.Context) {
	category := c.Param("category")

	if category == "" {
		category = c.Query("category")
	}

	if category == "" {
		c.JSON(400, gin.H{"error": "category es requerido"})
		return
	}

	resp, err := h.client.GetRestaurantsByCategory(
		context.Background(),
		&catalogpb.GetRestaurantsByCategoryRequest{
			Categoria: category,
		},
	)

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp.Restaurants)
}
