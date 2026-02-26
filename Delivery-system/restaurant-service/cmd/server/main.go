package main

import (
	"log"
	"net"
	"os"
	"restaurant-service/internal/database"
	grpcclient "restaurant-service/internal/grpc"

	_ "github.com/denisenkom/go-mssqldb"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"

	restaurantpb "delivery-proto/restaurantpb"
	"restaurant-service/internal/config"
	handler "restaurant-service/internal/handler/grpc"
	"restaurant-service/internal/repository"
	"restaurant-service/internal/service"
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

	catalogUserServer := os.Getenv("USER_SERVICE_ADDR")
	if catalogUserServer == "" {
		catalogUserServer = "user-service:50052"
	}

	userClient, err := grpcclient.NewUserClient(catalogUserServer)
	if err != nil {
		log.Fatal(err)
	}

	repo := repository.NewRestaurantRepository(db)
	svc := service.NewRestaurantService(repo, userClient)

	lis, err := net.Listen("tcp", ":50054")
	if err != nil {
		log.Fatal(err)
	}

	grpcServer := grpc.NewServer()

	restaurantpb.RegisterRestaurantServiceServer(
		grpcServer,
		handler.NewRestaurantGRPCServer(svc),
	)

	log.Println("Restaurant Service running on :50054")

	if err := grpcServer.Serve(lis); err != nil {
		log.Fatal(err)
	}

}
