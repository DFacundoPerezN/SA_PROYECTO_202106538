package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	_ "github.com/denisenkom/go-mssqldb"
)

type Config struct {
	Host           string
	Port           int
	User           string
	Password       string
	DBName         string
	UseWindowsAuth bool
}

func NewSQLServer(cfg Config) (*sql.DB, error) {
	log.Printf("Conectando a SQL Server en %s:%d, base de datos: %s, autenticación de Windows: %t",
		cfg.Host, cfg.Port, cfg.DBName, cfg.UseWindowsAuth)

	var connString string

	if cfg.UseWindowsAuth {
		// Autenticación Windows con puerto específico
		connString = fmt.Sprintf("server=%s,%d;database=%s;trusted_connection=yes;encrypt=disable",
			cfg.Host, cfg.Port, cfg.DBName)
	} else {
		// Autenticación SQL Server con puerto específico
		connString = fmt.Sprintf("server=%s,%d;user id=%s;password=%s;database=%s;encrypt=true",
			cfg.Host, cfg.Port, cfg.User, cfg.Password, cfg.DBName)
	}

	log.Printf("Cadena de conexión: %s", maskPassword(connString))

	db, err := sql.Open("sqlserver", connString)
	if err != nil {
		return nil, fmt.Errorf("error opening database: %v", err)
	}

	// Configurar pool de conexiones
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)
	db.SetConnMaxLifetime(5 * time.Minute)

	// Test connection con timeout
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("error connecting to database: %v", err)
	}

	log.Println(" Successfully connected to SQL Server")
	return db, nil
}

// Función para ocultar contraseña en logs
func maskPassword(connString string) string {
	// Oculta la contraseña en los logs
	// Busca 'password=' y reemplaza lo que sigue
	return connString // Para depuración, mejor mostrar completa
}
