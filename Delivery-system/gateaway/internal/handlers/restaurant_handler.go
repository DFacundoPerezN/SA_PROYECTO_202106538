package handlers

import (
	"net/http"

	grpcclient "api-gateway/internal/grpc"

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
