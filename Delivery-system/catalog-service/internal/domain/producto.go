package domain

import "time"

type Product struct {
	ID            int
	RestauranteID int
	Nombre        string
	Descripcion   string
	Precio        float64
	Disponible    bool
	Categoria     string
}

type ProductRecommendation struct {
	Id          int
	ClienteId   int
	ProductoId  int
	Recomendado bool
	Fecha       time.Time
}
