package main

import (
	"log"
	"net"

	"github.com/joho/godotenv"
	"google.golang.org/grpc"

	userpb "delivery-proto/userpb"
	"user-service/internal/config"
	"user-service/internal/database"
	userhandler "user-service/internal/handler/grpc"
	"user-service/internal/repository/sqlserver"
	"user-service/internal/service"
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

	userRepo := sqlserver.NewUserRepository(db)
	userService := service.NewUserService(userRepo)

	lis, err := net.Listen("tcp", ":50052")
	if err != nil {
		log.Fatal(err)
	}

	grpcServer := grpc.NewServer()

	userpb.RegisterUserServiceServer(
		grpcServer,
		userhandler.NewUserGRPCServer(userService),
	)

	log.Println("User service running on :50052")

	grpcServer.Serve(lis)
}
