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

// Promocion representa una promoción de un restaurante.
type Promocion struct {
	Id            int
	RestauranteId int
	Titulo        string
	Descripcion   string
	Tipo          string // "PORCENTAJE" | "ENVIO_GRATIS"
	Valor         float64
	FechaInicio   time.Time
	FechaFin      time.Time
	Activa        bool
}

// PromocionFiltros agrupa los filtros opcionales para GetPromociones.
type PromocionFiltros struct {
	RestauranteId int       // 0 = sin filtro
	SoloActivas   bool
	Tipo          string    // "" = sin filtro
	FechaDesde    time.Time // zero value = sin filtro
	FechaHasta    time.Time // zero value = sin filtro
}
