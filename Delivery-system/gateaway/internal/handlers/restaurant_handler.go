package handlers

import (
	"net/http"
	"strconv"

	grpcclient "api-gateway/internal/grpc"
	"delivery-proto/restaurantpb"

	"github.com/gin-gonic/gin"
)

type RestaurantHandler struct {
	restaurantClient *grpcclient.RestaurantClient
}

func NewRestaurantHandler(c *grpcclient.RestaurantClient) *RestaurantHandler {
	return &RestaurantHandler{restaurantClient: c}
}

func (h *RestaurantHandler) ListRestaurants(ctx *gin.Context) {

	resp, err := h.restaurantClient.ListRestaurants()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": "could not fetch restaurants",
		})
		return
	}

	var restaurants []gin.H

	for _, r := range resp.Restaurants {
		restaurants = append(restaurants, gin.H{
			"id":           r.Id,
			"nombre":       r.Nombre,
			"direccion":    r.Direccion,
			"latitud":      r.Latitud,
			"longitud":     r.Longitud,
			"telefono":     r.Telefono,
			"calificacion": r.Calificacion,
			"activo":       r.Activo,
		})
	}

	ctx.JSON(http.StatusOK, gin.H{
		"restaurants": restaurants,
	})

}

func (h *RestaurantHandler) CreateRestaurant(c *gin.Context) {

	var body struct {
		Nombre          string  `json:"nombre"`
		Direccion       string  `json:"direccion"`
		Latitud         float64 `json:"latitud"`
		Longitud        float64 `json:"longitud"`
		Telefono        string  `json:"telefono"`
		HorarioApertura string  `json:"horario_apertura"`
		HorarioCierre   string  `json:"horario_cierre"`
		UserID          int32   `json:"user_id"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	//userID := c.GetInt("user_id")

	resp, err := h.restaurantClient.CreateRestaurant(c, &restaurantpb.CreateRestaurantRequest{
		UserId:          body.UserID,
		Nombre:          body.Nombre,
		Direccion:       body.Direccion,
		Latitud:         body.Latitud,
		Longitud:        body.Longitud,
		Telefono:        body.Telefono,
		HorarioApertura: body.HorarioApertura,
		HorarioCierre:   body.HorarioCierre,
	})

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(201, resp)
}

func (h *RestaurantHandler) CreateRating(c *gin.Context) {

	clientID := c.GetInt("user_id")

	var req struct {
		RestaurantID int32  `json:"restaurant_id"`
		Stars        int32  `json:"stars"`
		Comment      string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "body inválido"})
		return
	}

	resp, err := h.restaurantClient.CreateRestaurantRating(c, &restaurantpb.CreateRestaurantRatingRequest{
		ClienteId:     int32(clientID),
		RestauranteId: req.RestaurantID,
		Estrellas:     req.Stars,
		Comentario:    req.Comment,
	})

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp)
}

func (h *RestaurantHandler) GetRatingAverage(c *gin.Context) {

	restaurantID, _ := strconv.Atoi(c.Param("id"))

	resp, err := h.restaurantClient.GetRestaurantRatingAverage(c, &restaurantpb.GetRestaurantRatingAverageRequest{
		RestauranteId: int32(restaurantID),
	})

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp)
}

func (h *RestaurantHandler) GetLatestRestaurants(c *gin.Context) {

	limitStr := c.DefaultQuery("n", "8")
	limit, _ := strconv.Atoi(limitStr)

	resp, err := h.restaurantClient.GetLatestRestaurants(
		c,
		&restaurantpb.GetLatestRestaurantsRequest{
			Limit: int32(limit),
		},
	)

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp.Restaurants)
}

func (h *RestaurantHandler) GetTopRatedRestaurants(c *gin.Context) {

	limitStr := c.DefaultQuery("n", "8")
	limit, _ := strconv.Atoi(limitStr)

	resp, err := h.restaurantClient.GetTopRatedRestaurants(
		c,
		&restaurantpb.GetTopRatedRestaurantsRequest{
			Limit: int32(limit),
		},
	)

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp.Restaurants)
}
