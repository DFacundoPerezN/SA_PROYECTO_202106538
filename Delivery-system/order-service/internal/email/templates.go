package email

import "fmt"

type OrderEmailData struct {
	ClienteNombre string
	OrderID       int
	Productos     string
	MontoTotal    float64
	FechaCreacion string
	Estado        string
}

func BuildOrderCreatedEmail(data OrderEmailData) (string, string) {

	subject := fmt.Sprintf("Tu orden #%d ha sido creada con exito paps", data.OrderID)

	body := fmt.Sprintf(`
Hola %s,

Tu orden ha sido creada exitosamente. :)

- Número de Orden: %d
- Productos:
%s

- Monto Total de la orden: Q%.2f
- Fecha de creación: %s
- Estado actual de la orden: %s

Gracias por usar nuestro servicio.

`, data.ClienteNombre, data.OrderID, data.Productos,
		data.MontoTotal, data.FechaCreacion, data.Estado)

	return subject, body
}
