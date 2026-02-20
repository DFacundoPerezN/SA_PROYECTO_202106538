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
