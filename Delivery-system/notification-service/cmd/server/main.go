package main

import (
	"log"
	"net"

	"github.com/joho/godotenv"
	"google.golang.org/grpc"

	"notification-service/internal/config"
	"notification-service/internal/email"
	handler "notification-service/internal/handler/grpc"
	"notification-service/internal/service"

	notificationpb "delivery-proto/notificationpb"
)

func main() {

	// -----------------------
	// CARGAR .ENV
	// -----------------------
	godotenv.Load()
	cfg := config.Load()

	// -----------------------
	// SMTP SENDER
	// -----------------------
	emailSender := email.NewSMTPSender(
		cfg.SMTPHost,
		cfg.SMTPPort,
		cfg.SMTPUser,
		cfg.SMTPPass,
		cfg.From,
	)

	// -----------------------
	// SERVICE
	// -----------------------
	notificationService := service.NewNotificationService(*emailSender)

	// -----------------------
	// gRPC SERVER
	// -----------------------
	lis, err := net.Listen("tcp", ":50056")
	if err != nil {
		log.Fatal("cannot listen:", err)
	}

	grpcServer := grpc.NewServer()

	notificationpb.RegisterNotificationServiceServer(
		grpcServer,
		handler.NewNotificationGRPCServer(notificationService),
	)

	log.Println("Notification Service running on :50056")

	if err := grpcServer.Serve(lis); err != nil {
		log.Fatal(err)
	}

}
