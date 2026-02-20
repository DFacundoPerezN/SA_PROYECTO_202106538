package service

import (
	"context"
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
