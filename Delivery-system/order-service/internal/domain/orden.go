package domain

type Order struct {
	Id                int
	ClienteId         int32
	ClienteNombre     string
	ClienteTelefono   string
	RestauranteId     int32
	RestauranteNombre string
	Estado            string
	RepartidorId      int32
	DireccionEntrega  string
	LatitudEntrega    float64
	LongitudEntrega   float64
	CostoTotal        float64
	Items             []OrderItem
}
