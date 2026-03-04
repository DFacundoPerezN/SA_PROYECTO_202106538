#!/bin/bash

# Script para desplegar todos los contenedores del sistema de Delivery
# Autor: Sistema de Delivery
# Fecha: March 2, 2026

set -e  # Detener el script si ocurre algún error

echo "========================================="
echo "  Deployment - Delivery System"
echo "========================================="

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar si Docker está instalado
if ! command -v docker &> /dev/null; then
    print_error "Docker no está instalado. Por favor, instala Docker primero."
    exit 1
fi

# Verificar si Docker Compose está instalado
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    print_error "Docker Compose no está instalado. Por favor, instala Docker Compose primero."
    exit 1
fi

# Determinar el comando de Docker Compose (docker-compose o docker compose)
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    DOCKER_COMPOSE="docker compose"
fi

print_info "Usando: $DOCKER_COMPOSE"

# Paso 1: Detener contenedores existentes si están corriendo
print_info "Deteniendo contenedores existentes..."
$DOCKER_COMPOSE down || print_warning "No hay contenedores previos para detener"

# Paso 2: Limpiar volúmenes huérfanos (opcional)
print_warning "¿Desea eliminar volúmenes huérfanos? (y/n)"
read -r CLEAN_VOLUMES
if [[ $CLEAN_VOLUMES == "y" || $CLEAN_VOLUMES == "Y" ]]; then
    print_info "Eliminando volúmenes huérfanos..."
    $DOCKER_COMPOSE down -v
fi

# Paso 3: Verificar archivos .env necesarios
print_info "Verificando archivos de configuración..."
if [ ! -f "./order-service/.env" ]; then
    print_warning "No se encontró ./order-service/.env"
fi
if [ ! -f "./notification-service/.env" ]; then
    print_warning "No se encontró ./notification-service/.env"
fi

# Paso 4: Construir las imágenes
print_info "Construyendo imágenes Docker..."
$DOCKER_COMPOSE build --no-cache

# Paso 5: Pull de imágenes desde Docker Hub
print_info "Descargando imágenes desde Docker Hub..."
$DOCKER_COMPOSE pull || print_warning "Algunas imágenes no pudieron ser descargadas"

# Paso 6: Levantar todos los servicios
print_info "Levantando todos los servicios..."
$DOCKER_COMPOSE up -d

# Paso 7: Esperar un momento para que los servicios inicien
print_info "Esperando a que los servicios inicien..."
sleep 5

# Paso 8: Mostrar estado de los contenedores
print_info "Estado de los contenedores:"
$DOCKER_COMPOSE ps

# Paso 9: Mostrar logs en tiempo real (opcional)
echo ""
print_info "========================================="
print_info "Deployment completado exitosamente!"
print_info "========================================="
echo ""
print_info "Servicios disponibles:"
echo "  - RabbitMQ Management: http://localhost:15672"
echo "  - API Gateway: http://localhost:8080"
echo "  - Auth Service: localhost:50051"
echo "  - User Service: localhost:50052"
echo "  - Catalog Service: localhost:50053"
echo "  - Restaurant Service: localhost:50054"
echo "  - Order Service: localhost:50055"
echo "  - Notification Service: localhost:50056"
echo ""
print_warning "Para ver los logs en tiempo real, ejecuta:"
echo "  $DOCKER_COMPOSE logs -f"
echo ""
print_warning "Para detener todos los servicios, ejecuta:"
echo "  $DOCKER_COMPOSE down"
echo ""
