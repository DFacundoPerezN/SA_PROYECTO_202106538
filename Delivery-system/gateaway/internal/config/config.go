package config

import (
	"log"
	"os"
)

type Config struct {
	ServerPort string
	AuthGRPC   string
	UserGRPC   string
}

func Load() *Config {
	cfg := &Config{
		ServerPort: getEnv("SERVER_PORT", "8080"),
		AuthGRPC:   getEnv("AUTH_GRPC_ADDR", "auth-service:50051"),
		UserGRPC:   getEnv("USER_GRPC_ADDR", "user-service:50052"),
	}

	log.Println("Config loaded:")
	log.Println("PORT:", cfg.ServerPort)
	log.Println("AUTH GRPC:", cfg.AuthGRPC)

	return cfg
}

func getEnv(key, fallback string) string {
	val := os.Getenv(key)
	if val == "" {
		return fallback
	}
	return val
}
