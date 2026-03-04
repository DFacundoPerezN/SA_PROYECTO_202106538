package main

import (
	"log"
	"net"

	"github.com/joho/godotenv"
	"google.golang.org/grpc"

	"convert-service/internal/cache"
	"convert-service/internal/client"
	"convert-service/internal/config"
	handler "convert-service/internal/handler/grpc"
	"convert-service/internal/service"

	convertpb "delivery-proto/convertpb"
)

func main() {

	// ---------------------------
	// LOAD ENV + CONFIG
	// ---------------------------

	godotenv.Load()
	cfg := config.Load()

	// ---------------------------
	// REDIS CONNECTION
	// ---------------------------

	redisCache, err := cache.NewRedisCache(
		cfg.RedisHost,
		cfg.RedisPort,
		cfg.RedisPassword,
		cfg.RedisDB,
	)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}

	log.Println("Connected to Redis")

	// ---------------------------
	// EXCHANGE RATE API CLIENT
	// ---------------------------

	apiClient := client.NewExchangeRateClient(cfg.ExchangeAPIURL, cfg.ExchangeAPIKey)

	// ---------------------------
	// DEPENDENCY INJECTION
	// ---------------------------

	convertService := service.NewConvertService(apiClient, redisCache, cfg.CacheTTL)

	// ---------------------------
	// gRPC SERVER
	// ---------------------------

	lis, err := net.Listen("tcp", ":"+cfg.ServerPort)
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()

	convertpb.RegisterConvertServiceServer(
		grpcServer,
		handler.NewConvertGRPCServer(convertService),
	)

	log.Printf("Convert Service running on :%s", cfg.ServerPort)

	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("Failed to serve: %v", err)
	}
}
