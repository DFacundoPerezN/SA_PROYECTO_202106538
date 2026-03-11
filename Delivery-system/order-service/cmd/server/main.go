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
	"order-service/internal/messaging"
	"order-service/internal/repository"
	"order-service/internal/service"

	orderpb "delivery-proto/orderpb"
)

func main() {

	// ---------------------------
	// CARGAR .ENV
	// ---------------------------
	if err := godotenv.Load(); err != nil {
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
	log.Println("Connected to SQL Server :)")

	// ---------------------------
	// CONEXIÓN A RABBITMQ
	// ---------------------------
	rabbitConn, err := messaging.NewRabbitMQConn()
	if err != nil {
		log.Fatalf("No se pudo conectar a RabbitMQ: %v", err)
	}
	defer rabbitConn.Close()

	// ---------------------------
	// CLIENTES gRPC EXTERNOS
	// ---------------------------
	catalogAddr := os.Getenv("CATALOG_SERVICE_ADDR")
	if catalogAddr == "" {
		catalogAddr = "catalog-service:50053"
	}
	catalogClient, err := grpcclient.NewCatalogClient(catalogAddr)
	if err != nil {
		log.Fatalf("could not connect to catalog-service: %v", err)
	}
	log.Println("Connected to catalog-service:", catalogAddr)

	userAddr := os.Getenv("USER_SERVICE_ADDR")
	if userAddr == "" {
		userAddr = "user-service:50052"
	}
	userClient, err := grpcclient.NewUserClient(userAddr)
	if err != nil {
		log.Fatalf("cannot connect to user-service: %v", err)
	}

	notiAddr := os.Getenv("NOTIFICATION_SERVICE_ADDR")
	if notiAddr == "" {
		notiAddr = "notification-service:50056"
	}
	notificationClient, err := grpcclient.NewNotificationClient(notiAddr)
	if err != nil {
		log.Fatalf("cannot connect to notification-service: %v", err)
	}

	// ---------------------------
	// DEPENDENCY INJECTION
	// ---------------------------
	publisher := messaging.NewPublisher(rabbitConn)

	orderRepository := repository.NewOrderRepository(db)
	orderService := service.NewOrderService(
		orderRepository,
		catalogClient,
		userClient,
		notificationClient,
		publisher,
	)

	// ---------------------------
	// ARRANCAR CONSUMER (self-loop)
	// El consumer escucha la cola orders.pending y llama a
	// orderService.ProcessOrder() para persistir cada orden en BD.
	// ---------------------------
	consumer := messaging.NewConsumer(rabbitConn, orderService)
	go consumer.Start()
	log.Println("Order consumer escuchando cola 'orders.pending'")

	// ---------------------------
	// gRPC SERVER
	// ---------------------------
	orderHandler := handler.NewOrderGRPCServer(orderService)

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
