package main

import (
	"log"
	"net"

	"catalog-service/internal/database"

	_ "github.com/denisenkom/go-mssqldb"
	"github.com/joho/godotenv"
	"google.golang.org/grpc"

	"catalog-service/internal/config"
	handler "catalog-service/internal/handler/grpc"
	"catalog-service/internal/repository"
	"catalog-service/internal/service"

	catalogpb "delivery-proto/catalogpb"
)

func main() {

	// ---------------------------
	// LOAD ENV + CONFIG
	// ---------------------------

	godotenv.Load()
	cfg := config.Load()

	// ---------------------------
	// DATABASE CONNECTION
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

	if err := db.Ping(); err != nil {
		log.Fatalf("database unreachable: %v", err)
	}

	log.Println("Connected to DB_PRODUCTOS")

	// ---------------------------
	// DEPENDENCY INJECTION
	// ---------------------------

	productRepo := repository.NewProductRepository(db)
	productService := service.NewProductService(productRepo)

	// ---------------------------
	// gRPC SERVER
	// ---------------------------

	lis, err := net.Listen("tcp", ":50053")
	if err != nil {
		log.Fatal(err)
	}

	grpcServer := grpc.NewServer()

	catalogpb.RegisterCatalogServiceServer(
		grpcServer,
		handler.NewCatalogGRPCServer(productService),
	)

	log.Println("Catalog Service running on :50053")

	if err := grpcServer.Serve(lis); err != nil {
		log.Fatal(err)
	}
}
