package main

import (
	"log"
	"net"
	"payment-service/internal/config"
	"payment-service/internal/database"
	"payment-service/internal/repository"
	"payment-service/internal/service"

	paymentpb "delivery-proto/paymentpb"
	paymenthandler "payment-service/internal/handler/grpc"

	"github.com/joho/godotenv"
	"google.golang.org/grpc"
)

func main() {

	godotenv.Load()
	cfg := config.Load()

	db, err := database.NewSQLServer(database.Config{
		Host:           cfg.DBHost,
		Port:           cfg.DBPort,
		User:           cfg.DBUser,
		Password:       cfg.DBPassword,
		DBName:         cfg.DBName,
		UseWindowsAuth: cfg.DBWindowsAuth,
	})
	if err != nil {
		log.Fatal(err)
	}
	paymentRepo := repository.NewPaymentRepository(db)
	paymentService := service.NewPaymentService(paymentRepo)

	lis, err := net.Listen("tcp", ":50058")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()

	paymentpb.RegisterPaymentServiceServer(
		grpcServer,
		paymenthandler.NewPaymentGRPCServer(paymentService),
	)

	log.Println("Payment-service corriendo en puerto 50058")

	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
