package grpcclient

import (
	"context"
	"time"

	notificationpb "delivery-proto/notificationpb"

	"google.golang.org/grpc"
)

type NotificationClient struct {
	client notificationpb.NotificationServiceClient
}

func NewNotificationClient(addr string) (*NotificationClient, error) {

	conn, err := grpc.Dial(addr, grpc.WithInsecure())
	if err != nil {
		return nil, err
	}

	return &NotificationClient{
		client: notificationpb.NewNotificationServiceClient(conn),
	}, nil
}

func (n *NotificationClient) SendOrderCancelledEmail(
	ctx context.Context,
	req *notificationpb.SendOrderCanceledEmailRequest,
) error {

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	_, err := n.client.SendOrderCanceledEmail(ctx, req)
	return err
}
