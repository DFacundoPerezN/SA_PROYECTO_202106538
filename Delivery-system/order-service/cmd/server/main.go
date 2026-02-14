package main

import (
	"log"
	"net"
	"os"

	_ "github.com/denisenkom/go-mssqldb"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"

	// internos
	"order-service/internal/config"
	"order-service/internal/database"
	grpcclient "order-service/internal/grpc"
	handler "order-service/internal/handler/grpc"
	"order-service/internal/repository"
	"order-service/internal/service"

	orderpb "delivery-proto/orderpb"
)

func main() {

	// ---------------------------
	// CARGAR .ENV
	// ---------------------------
	err := godotenv.Load()
	if err != nil {
		log.Println(".env not found, using system env")
	}

	cfg := config.Load()

	// ---------------------------
	// CONEXIÓN A SQL SERVER
	// ---------------------------

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

	log.Println("Connected to SQL Server")

	// ---------------------------
	// CLIENTE gRPC → catalog-service
	// ---------------------------

	catalogClientServer := os.Getenv("CATALOG_SERVICE_ADDR")
	if catalogClientServer == "" {
		catalogClientServer = "127.0.0.1:50053"
	}

	catalogClient, err := grpcclient.NewCatalogClient(catalogClientServer)
	if err != nil {
		log.Fatalf("could not connect to catalog-service: %v", err)
	}

	log.Println("Connected to catalog-service:", catalogClientServer)

	// ---------------------------
	// DEPENDENCY INJECTION
	// ---------------------------

	orderRepository := repository.NewOrderRepository(db)
	orderService := service.NewOrderService(orderRepository, catalogClient)
	orderHandler := handler.NewOrderGRPCServer(orderService)

	// ---------------------------
	// gRPC SERVER
	// ---------------------------

	port := os.Getenv("GRPC_PORT")
	if port == "" {
		port = "50055"
	}

	lis, err := net.Listen("tcp", ":"+port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	grpcServer := grpc.NewServer()

	orderpb.RegisterOrderServiceServer(grpcServer, orderHandler)

	log.Println("Order Service running on port:", port)

	if err := grpcServer.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
