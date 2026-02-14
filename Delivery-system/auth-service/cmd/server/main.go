package main

import (
	"log"
	"net"
	"time"

	"github.com/joho/godotenv"
	"google.golang.org/grpc"

	"auth-service/internal/config"
	grpcclient "auth-service/internal/grpc"
	handler "auth-service/internal/handler/grpc"
	"auth-service/internal/jwt"
	"auth-service/internal/service"
	authpb "auth-service/proto"
)

func main() {

	godotenv.Load()
	cfg := config.Load()

	// ---------------------------
	// CONEXIÓN AL USER-SERVICE
	// ---------------------------

	// ⚠️ IMPORTANTE:
	// si usas docker-compose debe ser: "user-service:50052"
	// si usas local: "localhost:50052"
	userClient, err := grpcclient.NewUserClient("localhost:50052")
	if err != nil {
		log.Fatalf("could not connect to user-service: %v", err)
	}

	// ---------------------------
	// JWT MANAGER
	// ---------------------------

	jwtManager := jwt.NewJWTManager(
		cfg.JWTSecret,
		time.Hour*time.Duration(cfg.JWTExpirationHours),
	)

	// ---------------------------
	// AUTH SERVICE
	// ---------------------------

	authService := service.NewAuthService(userClient, jwtManager)

	// ---------------------------
	// gRPC SERVER
	// ---------------------------

	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatal(err)
	}

	grpcServer := grpc.NewServer()

	authpb.RegisterAuthServiceServer(
		grpcServer,
		handler.NewAuthGRPCServer(authService),
	)

	log.Println("Auth Service running on :50051")

	if err := grpcServer.Serve(lis); err != nil {
		log.Fatal(err)
	}
}
