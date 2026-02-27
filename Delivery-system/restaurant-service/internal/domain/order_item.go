package domain

type OrderItem struct {
	ProductoId     int32
	NombreProducto string
	PrecioUnitario float64
	Cantidad       int32
	Comentarios    string
}
