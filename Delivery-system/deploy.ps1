# Script para desplegar todos los contenedores del sistema de Delivery
# Autor: Sistema de Delivery
# Fecha: March 2, 2026

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "  Deployment - Delivery System" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

function Print-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Print-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Print-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Verificar si Docker está instalado
try {
    docker --version | Out-Null
} catch {
    Print-Error "Docker no está instalado. Por favor, instala Docker Desktop primero."
    exit 1
}

# Verificar si Docker Compose está disponible
$dockerComposeCmd = $null
try {
    docker-compose --version | Out-Null
    $dockerComposeCmd = "docker-compose"
} catch {
    try {
        docker compose version | Out-Null
        $dockerComposeCmd = "docker compose"
    } catch {
        Print-Error "Docker Compose no está disponible. Por favor, instala Docker Compose."
        exit 1
    }
}

Print-Info "Usando: $dockerComposeCmd"

# Paso 1: Detener contenedores existentes si están corriendo
Print-Info "Deteniendo contenedores existentes..."
try {
    if ($dockerComposeCmd -eq "docker-compose") {
        docker-compose down
    } else {
        docker compose down
    }
} catch {
    Print-Warning "No hay contenedores previos para detener"
}

# Paso 2: Limpiar volúmenes huérfanos (opcional)
$cleanVolumes = Read-Host "¿Desea eliminar volúmenes huérfanos? (y/n)"
if ($cleanVolumes -eq "y" -or $cleanVolumes -eq "Y") {
    Print-Info "Eliminando volúmenes huérfanos..."
    if ($dockerComposeCmd -eq "docker-compose") {
        docker-compose down -v
    } else {
        docker compose down -v
    }
}

# Paso 3: Verificar archivos .env necesarios
Print-Info "Verificando archivos de configuración..."
if (-not (Test-Path "./order-service/.env")) {
    Print-Warning "No se encontró ./order-service/.env"
}
if (-not (Test-Path "./notification-service/.env")) {
    Print-Warning "No se encontró ./notification-service/.env"
}

# Paso 4: Construir las imágenes
Print-Info "Construyendo imágenes Docker..."
if ($dockerComposeCmd -eq "docker-compose") {
    docker-compose build --no-cache
} else {
    docker compose build --no-cache
}

# Paso 5: Pull de imágenes desde Docker Hub
Print-Info "Descargando imágenes desde Docker Hub..."
try {
    if ($dockerComposeCmd -eq "docker-compose") {
        docker-compose pull
    } else {
        docker compose pull
    }
} catch {
    Print-Warning "Algunas imágenes no pudieron ser descargadas"
}

# Paso 6: Levantar todos los servicios
Print-Info "Levantando todos los servicios..."
if ($dockerComposeCmd -eq "docker-compose") {
    docker-compose up -d
} else {
    docker compose up -d
}

# Paso 7: Esperar un momento para que los servicios inicien
Print-Info "Esperando a que los servicios inicien..."
Start-Sleep -Seconds 5

# Paso 8: Mostrar estado de los contenedores
Print-Info "Estado de los contenedores:"
if ($dockerComposeCmd -eq "docker-compose") {
    docker-compose ps
} else {
    docker compose ps
}

# Paso 9: Información final
Write-Host ""
Print-Info "========================================="
Print-Info "Deployment completado exitosamente!"
Print-Info "========================================="
Write-Host ""
Print-Info "Servicios disponibles:"
Write-Host "  - RabbitMQ Management: http://localhost:15672" -ForegroundColor White
Write-Host "  - API Gateway: http://localhost:8080" -ForegroundColor White
Write-Host "  - Auth Service: localhost:50051" -ForegroundColor White
Write-Host "  - User Service: localhost:50052" -ForegroundColor White
Write-Host "  - Catalog Service: localhost:50053" -ForegroundColor White
Write-Host "  - Restaurant Service: localhost:50054" -ForegroundColor White
Write-Host "  - Order Service: localhost:50055" -ForegroundColor White
Write-Host "  - Notification Service: localhost:50056" -ForegroundColor White
Write-Host ""
Print-Warning "Para ver los logs en tiempo real, ejecuta:"
Write-Host "  $dockerComposeCmd logs -f" -ForegroundColor White
Write-Host ""
Print-Warning "Para detener todos los servicios, ejecuta:"
Write-Host "  $dockerComposeCmd down" -ForegroundColor White
Write-Host ""
