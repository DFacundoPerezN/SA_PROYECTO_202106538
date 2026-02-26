package config

import (
	"os"
	"strconv"
)

type Config struct {
	DBHost        string
	DBPort        int
	DBUser        string
	DBPassword    string
	DBName        string
	ServerPort    string
	DBWindowsAuth bool
}

func Load() *Config {
	return &Config{
		DBHost:        getEnv("DB_HOST", "sa-delivereats.database.windows.net"),
		DBPort:        getEnvAsInt("DB_PORT", 1433),
		DBUser:        getEnv("DB_USER", "adminsql"),
		DBPassword:    getEnv("DB_PASSWORD", "Delivereats123"),
		DBName:        getEnv("DB_NAME", "Delivereats_SA_Productos"),
		ServerPort:    getEnv("SERVER_PORT", "8080"),
		DBWindowsAuth: getEnvAsBool("DB_WINDOWS_AUTH", false), // false por defecto
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

func getEnvAsBool(key string, defaultValue bool) bool {
	if value, exists := os.LookupEnv(key); exists {
		if boolValue, err := strconv.ParseBool(value); err == nil {
			return boolValue
		}
	}
	return defaultValue
}
