package domain

type TopRestaurantOrders struct {
	RestauranteId     int    `json:"restaurante_id"`
	RestauranteNombre string `json:"restaurante_nombre"`
	TotalOrdenes      int    `json:"total_ordenes"`
}
