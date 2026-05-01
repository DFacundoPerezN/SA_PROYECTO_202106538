package main

import (
	"context"
	"log"
	"net"
	"os"
	"strconv"
	"time"

	_ "github.com/denisenkom/go-mssqldb"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"

	orderpb "delivery-proto/orderpb"

	"order-service/internal/config"
	"order-service/internal/database"
	grpcclient "order-service/internal/grpc"
	handler "order-service/internal/handler/grpc"
	"order-service/internal/messaging"
	"order-service/internal/repository"
	"order-service/internal/service"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println(".env not found, using system env")
	}

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
	log.Println("Connected to SQL Server :)")

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

	orderRepository := repository.NewOrderRepository(db)

	autoRejectOnce, _ := strconv.ParseBool(os.Getenv("AUTO_REJECT_ONCE"))
	autoRejectMinutes := getEnvAsInt("AUTO_REJECT_MINUTES", 60)

	if autoRejectOnce {
		log.Printf("[auto-reject] one-shot mode enabled (threshold=%d minutes)", autoRejectMinutes)

		orderService := service.NewOrderService(
			orderRepository,
			nil,
			userClient,
			notificationClient,
			nil,
		)

		updated, notified, runErr := orderService.AutoRejectStaleCreatedOrders(
			context.Background(),
			time.Duration(autoRejectMinutes)*time.Minute,
		)
		if runErr != nil {
			log.Fatalf("[auto-reject] failed: %v", runErr)
		}

		log.Printf("[auto-reject] completed. rejected=%d notified=%d", updated, notified)
		return
	}

	rabbitConn, err := messaging.NewRabbitMQConn()
	if err != nil {
		log.Fatalf("No se pudo conectar a RabbitMQ: %v", err)
	}
	defer rabbitConn.Close()

	catalogAddr := os.Getenv("CATALOG_SERVICE_ADDR")
	if catalogAddr == "" {
		catalogAddr = "catalog-service:50053"
	}
	catalogClient, err := grpcclient.NewCatalogClient(catalogAddr)
	if err != nil {
		log.Fatalf("could not connect to catalog-service: %v", err)
	}
	log.Println("Connected to catalog-service:", catalogAddr)

	publisher := messaging.NewPublisher(rabbitConn)

	orderService := service.NewOrderService(
		orderRepository,
		catalogClient,
		userClient,
		notificationClient,
		publisher,
	)

	consumer := messaging.NewConsumer(rabbitConn, orderService)
	go consumer.Start()
	log.Println("Order consumer escuchando cola 'orders.pending'")

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

func getEnvAsInt(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}

	return parsed
}
