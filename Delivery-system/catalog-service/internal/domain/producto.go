package domain

type Product struct {
	ID            int
	RestauranteID int
	Nombre        string
	Descripcion   string
	Precio        float64
	Disponible    bool
	Categoria     string
}
