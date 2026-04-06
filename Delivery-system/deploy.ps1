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

function Invoke-Compose {
    param([string[]]$ComposeArgs)

    if ($dockerComposeCmd -eq "docker-compose") {
        & docker-compose @ComposeArgs
    } else {
        & docker compose @ComposeArgs
    }
}

$pullServices = @(
    "rabbitmq",
    "redis",
    "auth-service",
    "notification-service"
)

$buildServices = @(
    "api-gateway",
    "user-service",
    "catalog-service",
    "restaurant-service",
    "order-service",
    "convert-service",
    "payment-service"
)

$env:COMPOSE_BAKE = "false"
$env:COMPOSE_PARALLEL_LIMIT = "1"
$env:DOCKER_BUILDKIT = "0"

Print-Info "Modo de build estable activado (sin Bake, sin paralelismo y sin --no-cache)"

# Paso 1: Detener contenedores existentes si están corriendo
Print-Info "Deteniendo contenedores existentes..."
try {
    Invoke-Compose @("down")
} catch {
    Print-Warning "No hay contenedores previos para detener"
}

# Paso 2: Limpiar volúmenes huérfanos (opcional)
$cleanVolumes = Read-Host "¿Desea eliminar volúmenes huérfanos? (y/n)"
if ($cleanVolumes -eq "y" -or $cleanVolumes -eq "Y") {
    Print-Info "Eliminando volúmenes huérfanos..."
    Invoke-Compose @("down", "-v")
}

# Paso 3: Verificar archivos .env necesarios
Print-Info "Verificando archivos de configuración..."
if (-not (Test-Path "./order-service/.env")) {
    Print-Warning "No se encontró ./order-service/.env"
}
if (-not (Test-Path "./notification-service/.env")) {
    Print-Warning "No se encontró ./notification-service/.env"
}

# Paso 4: Pull de imágenes preconstruidas
Print-Info "Descargando imágenes preconstruidas desde Docker Hub..."
try {
    Invoke-Compose (@("pull") + $pullServices)
} catch {
    Print-Warning "Algunas imágenes no pudieron ser descargadas"
}

# Paso 5: Construir las imágenes locales de forma secuencial
Print-Info "Construyendo imágenes locales de forma secuencial..."
foreach ($service in $buildServices) {
    Print-Info "Construyendo $service..."
    Invoke-Compose @("build", $service)
}

# Paso 6: Levantar todos los servicios
Print-Info "Levantando todos los servicios..."
Invoke-Compose @("up", "-d")

# Paso 7: Esperar un momento para que los servicios inicien
Print-Info "Esperando a que los servicios inicien..."
Start-Sleep -Seconds 5

# Paso 8: Mostrar estado de los contenedores
Print-Info "Estado de los contenedores:"
Invoke-Compose @("ps")

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
