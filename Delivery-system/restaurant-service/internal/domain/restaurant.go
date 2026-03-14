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
	RestauranteId int // 0 = sin filtro
	SoloActivas   bool
	Tipo          string    // "" = sin filtro
	FechaDesde    time.Time // zero value = sin filtro
	FechaHasta    time.Time // zero value = sin filtro
}

// Cupon representa un cupón de descuento emitido por un restaurante.
type Cupon struct {
	Id              int
	RestauranteId   int
	Codigo          string
	Titulo          string
	Descripcion     string
	Valor           float64
	UsoMaximo       int
	UsosActuales    int
	FechaInicio     time.Time
	FechaExpiracion time.Time
	Autorizado      bool
	Activo          bool
}

// CuponFiltros agrupa los filtros opcionales para GetCupones.
type CuponFiltros struct {
	RestauranteId   int // 0 = sin filtro
	SoloActivos     bool
	SoloAutorizados bool
	Codigo          string    // "" = sin filtro (búsqueda exacta)
	FechaDesde      time.Time // zero value = sin filtro
	FechaHasta      time.Time // zero value = sin filtro
}

type RestaurantDeal struct {
	Nombre       string
	Id           int
	Calificacion float64
}
