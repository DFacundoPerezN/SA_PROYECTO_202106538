package grpc

import (
	"context"

	notificationpb "delivery-proto/notificationpb"
	"notification-service/internal/service"
)

type NotificationGRPCServer struct {
	notificationpb.UnimplementedNotificationServiceServer
	service *service.NotificationService
}

func NewNotificationGRPCServer(s *service.NotificationService) *NotificationGRPCServer {
	return &NotificationGRPCServer{service: s}
}

func (n *NotificationGRPCServer) SendOrderCanceledEmail(
	ctx context.Context,
	req *notificationpb.SendOrderCanceledEmailRequest,
) (*notificationpb.SendOrderCanceledEmailResponse, error) {

	return n.service.SendOrderCanceledEmail(ctx, req)

}

func (s *NotificationGRPCServer) SendOrderRejectedEmail(
	ctx context.Context,
	req *notificationpb.OrderRejectedEmailRequest,
) (*notificationpb.OrderRejectedEmailResponse, error) {

	err := s.service.SendOrderRejectedEmail(req)
	if err != nil {
		return nil, err
	}

	return &notificationpb.OrderRejectedEmailResponse{
		Sent: true,
	}, nil
}

func (s *NotificationGRPCServer) SendDriverAssignedEmail(
	ctx context.Context,
	req *notificationpb.DriverAssignedEmailRequest,
) (*notificationpb.DriverAssignedEmailResponse, error) {

	err := s.service.SendDriverAssignedEmail(req)
	if err != nil {
		return nil, err
	}

	return &notificationpb.DriverAssignedEmailResponse{
		Sent: true,
	}, nil
}
