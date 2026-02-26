package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"api-gateway/internal/config"
	gatewaygrpc "api-gateway/internal/grpc"
	"api-gateway/internal/handlers"
	"api-gateway/internal/middleware"

	userpb "delivery-proto/userpb"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, PUT, DELETE, OPTIONS, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

func main() {

	// Load .env
	if err := godotenv.Load(); err != nil {
		log.Println(".env not found, using system env")
	}

	// Load config
	cfg := config.Load()

	// Connect to auth-service (gRPC)
	authClient, err := gatewaygrpc.NewAuthClient(cfg.AuthGRPC)
	if err != nil {
		log.Fatal("cannot connect to auth-service:", err)
	}
	// conectar user-service (gRPC)
	// ¡IMPORTANTE!:
	// si usas docker-compose debe ser "user-service:50052"
	// si usas local: "localhost:50052"
	userConn, err := grpc.Dial(
		"user-service:50052",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		log.Fatal("cannot connect to user-service:", err)
	}

	catalogClient, err := gatewaygrpc.NewCatalogClient("catalog-service:50053")
	if err != nil {
		log.Fatalf("could not connect to catalog-service: %v", err)
	}

	orderClient, err := gatewaygrpc.NewOrderClient("order-service:50055")
	if err != nil {
		log.Fatal("cannot connect to order-service:", err)
	}

	// ---------------- RESTAURANT SERVICE ----------------

	restaurantClient, err := gatewaygrpc.NewRestaurantClient("restaurant-service:50054")
	if err != nil {
		log.Fatalf("could not connect to restaurant-service: %v", err)
	}

	restaurantHandler := handlers.NewRestaurantHandler(restaurantClient)

	userServiceClient := userpb.NewUserServiceClient(userConn)
	userClient := gatewaygrpc.NewUserClient(userServiceClient)

	authHandler := handlers.NewAuthHandler(authClient, userClient)

	catalogHandler := handlers.NewCatalogHandler(catalogClient)

	orderHandler := handlers.NewOrderHandler(orderClient)

	// Gin
	router := gin.Default()
	router.Use(CORSMiddleware())

	// Health
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// PUBLIC ROUTES
	api := router.Group("/api")
	{
		api.POST("auth/login", authHandler.Login)
		api.POST("users", authHandler.Register)
		api.GET("restaurants/:id/products", catalogHandler.GetProductsByRestaurant)
		api.GET("restaurants", restaurantHandler.ListRestaurants)
		api.GET("orders/available", orderHandler.GetAvailableOrders)
		api.POST("products", catalogHandler.CreateProduct)
	}

	// PROTECTED ROUTES
	protected := router.Group("/api")
	protected.Use(middleware.AuthMiddleware(authClient))
	{
		protected.GET("/profile", func(c *gin.Context) {
			userID, _ := c.Get("user_id")
			email, _ := c.Get("email")

			c.JSON(http.StatusOK, gin.H{
				"user_id": userID,
				"email":   email,
			})
		})

		protected.POST("/restaurants", restaurantHandler.CreateRestaurant)

		protected.POST("/orders", orderHandler.CreateOrder)
		protected.PATCH("/orders/:id/status", orderHandler.UpdateStatus)
		protected.POST("/orders/:id/cancel", orderHandler.CancelOrder)
		// cliente
		protected.GET("/orders/me", orderHandler.GetMyOrders)
		// restaurante
		protected.GET("/orders/restaurant/:id", orderHandler.GetRestaurantOrders)
		// repartidor
		protected.PUT("/orders/:id/assign", orderHandler.AssignDriver)
		protected.GET("/orders/driver/me", orderHandler.GetMyDriverOrders)
	}

	// HTTP server
	srv := &http.Server{
		Addr:         ":" + cfg.ServerPort,
		Handler:      router,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server
	go func() {
		log.Println("API Gateway running on port", cfg.ServerPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("listen:", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatal("Server forced to shutdown:", err)
	}

	log.Println("Server exited properly")
}
