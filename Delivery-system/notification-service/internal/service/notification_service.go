package service

import (
	"context"
	"delivery-proto/notificationpb"
	pb "delivery-proto/notificationpb"
	"fmt"
	"notification-service/internal/email"
)

type NotificationService struct {
	emailSender email.SMTPSender
}

func NewNotificationService(emailSender email.SMTPSender) *NotificationService {
	return &NotificationService{emailSender: emailSender}
}

func (s *NotificationService) SendOrderCanceledEmail(
	ctx context.Context,
	req *pb.SendOrderCanceledEmailRequest,
) (*pb.SendOrderCanceledEmailResponse, error) {

	body := fmt.Sprintf(`
Hola,

Tu orden ha sido cancelada.

Número de orden: %d
Productos: %s
Fecha de cancelación: %s
Cancelado por: %s (%s)
Motivo: %s
Estado actual: %s

Gracias por usar nuestra plataforma.
`,
		req.OrderId,
		req.Productos,
		req.FechaCancelacion,
		req.NombreUsuario,
		req.RolUsuario,
		req.Motivo,
		req.Estado,
	)

	err := s.emailSender.Send(
		req.Email,
		"Tu orden fue cancelada",
		body,
	)

	if err != nil {
		return nil, err
	}

	return &pb.SendOrderCanceledEmailResponse{
		Message: "Email sent successfully",
	}, nil
}

func (s *NotificationService) SendOrderRejectedEmail(req *notificationpb.OrderRejectedEmailRequest) error {

	var productList string

	for _, p := range req.Products {
		productList += fmt.Sprintf("- %s x%d\n", p.Name, p.Quantity)
	}

	subject := fmt.Sprintf("Tu orden #%d fue rechazada", req.OrderId)

	body := fmt.Sprintf(`
Hola, 

El restaurante "%s" ha rechazado tu orden.

Número de orden: %d

Productos:
%s

Estado actual: %s

Lamentamos los inconvenientes. :-C

Delivereats
`,
		req.RestaurantName,
		req.OrderId,
		productList,
		req.Status,
	)

	return s.emailSender.Send(req.ToEmail, subject, body)
}

func (s *NotificationService) SendDriverAssignedEmail(req *notificationpb.DriverAssignedEmailRequest) error {

	//fmt.Printf("Enviando correo de asignación de conductor para orden %d al cliente %s (%s)\n", req.OrderId, req.DriverName, req.ToEmail)

	var productList string

	for _, p := range req.Products {
		productList += fmt.Sprintf("- %s x%d\n", p.Name, p.Quantity)
	}

	subject := fmt.Sprintf("Tu repartidor ya va en camino - Orden #%d", req.OrderId)

	body := fmt.Sprintf(`
¡Buenas noticias!

Tu pedido del restaurante "%s" ya tiene repartidor asignado.

Número de orden: %d

Repartidor:
Nombre: %s
Teléfono: %s
Estado actual: En camino

Productos:
%s

Tu pedido pronto saldrá en camino.

Delivereats
`,
		req.RestaurantName,
		req.OrderId,
		req.DriverName,
		req.DriverPhone,
		productList,
	)

	return s.emailSender.Send(req.ToEmail, subject, body)
}
