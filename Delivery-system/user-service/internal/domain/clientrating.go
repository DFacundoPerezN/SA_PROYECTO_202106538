package domain

import "time"

type ClientRating struct {
	Id           int
	ClienteId    int
	RepartidorId int
	OrdenId      int
	Estrellas    int
	Comentario   string
	Fecha        time.Time
}
