package handlers

import (
	"net/http"

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
