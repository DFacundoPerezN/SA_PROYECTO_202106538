package config

import (
	"log"
	"os"
)

type Config struct {
	ServerPort string
	AuthGRPC   string
}

func Load() *Config {
	cfg := &Config{
		ServerPort: getEnv("SERVER_PORT", "8080"),
		AuthGRPC:   getEnv("AUTH_GRPC_ADDR", "localhost:50051"),
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
