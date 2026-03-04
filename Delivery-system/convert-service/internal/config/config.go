package config

import (
	"os"
	"strconv"
)

type Config struct {
	RedisHost        string
	RedisPort        string
	RedisPassword    string
	RedisDB          int
	CacheTTL         int // segundos
	ExchangeAPIKey   string
	ExchangeAPIURL   string
	ServerPort       string
	DefaultCurrency  string
}

func Load() *Config {
	return &Config{
		RedisHost:       getEnv("REDIS_HOST", "localhost"),
		RedisPort:       getEnv("REDIS_PORT", "6379"),
		RedisPassword:   getEnv("REDIS_PASSWORD", ""),
		RedisDB:         getEnvAsInt("REDIS_DB", 0),
		CacheTTL:        getEnvAsInt("CACHE_TTL", 3600), // 1 hora por defecto
		ExchangeAPIKey:  getEnv("EXCHANGE_API_KEY", ""),
		ExchangeAPIURL:  getEnv("EXCHANGE_API_URL", "https://v6.exchangerate-api.com/v6"),
		ServerPort:      getEnv("SERVER_PORT", "50057"),
		DefaultCurrency: getEnv("DEFAULT_CURRENCY", "USD"),
	}
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	if value, exists := os.LookupEnv(key); exists {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}
