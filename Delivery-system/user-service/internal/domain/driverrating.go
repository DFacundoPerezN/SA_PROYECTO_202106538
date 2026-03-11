package domain

import "time"

type DriverRating struct {
	Id           int
	ClienteId    int
	RepartidorId int
	Estrellas    int
	Comentario   string
	Fecha        time.Time
}
