package domain

import "time"

type Restaurant struct {
	ID              int
	Nombre          string
	Direccion       string
	Latitud         float64
	Longitud        float64
	Telefono        string
	HorarioApertura string
	HorarioCierre   string
	Calificacion    float64
}

type RestaurantRating struct {
	Id            int
	RestauranteId int
	ClienteId     int
	Estrellas     int
	Comentario    string
	Fecha         time.Time
}
