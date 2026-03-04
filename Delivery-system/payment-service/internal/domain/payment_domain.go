package domain

type Payment struct {
	Id          int
	OrdenId     int
	ClienteId   int
	PrecioFinal float64
	UsaCupon    bool
	MetodoPago  string
	Estado      string
	Moneda      string
}
