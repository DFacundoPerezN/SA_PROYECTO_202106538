package main

import (
	"context"
	"log"
	"net"
	"runtime/debug"
	"time"

	"github.com/joho/godotenv"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	userpb "delivery-proto/userpb"
	"user-service/internal/config"
	"user-service/internal/database"
	userhandler "user-service/internal/handler/grpc"
	"user-service/internal/repository/sqlserver"
	"user-service/internal/service"
)

func loggingUnaryInterceptor(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (resp interface{}, err error) {
	start := time.Now()

	defer func() {
		duration := time.Since(start)

		if recovered := recover(); recovered != nil {
			log.Printf("[user-service][panic] method=%s duration=%s panic=%v\n%s", info.FullMethod, duration, recovered, debug.Stack())
			err = status.Error(codes.Internal, "internal server error")
			return
		}

		if err != nil {
			log.Printf("[user-service][grpc-error] method=%s duration=%s error=%v", info.FullMethod, duration, err)
		}
	}()

	return handler(ctx, req)
}

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

	grpcServer := grpc.NewServer(grpc.UnaryInterceptor(loggingUnaryInterceptor))

	userpb.RegisterUserServiceServer(
		grpcServer,
		userhandler.NewUserGRPCServer(userService),
	)

	log.Println("User service running on :50052")
	log.Println("Prueba completada")

	if err := grpcServer.Serve(lis); err != nil {
		log.Fatal(err)
	}
}
