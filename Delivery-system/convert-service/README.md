# Convert Service

Servicio de conversión de monedas con caché Redis y consumo de API externa.

## Características

- ✅ Consumo de API externa (ExchangeRate-API) para obtener tipos de cambio
- ✅ Caché con Redis para optimizar consultas
- ✅ Fallback automático a caché cuando la API falla
- ✅ Arquitectura gRPC
- ✅ TTL configurable para datos en caché

## Flujo de Funcionamiento

1. **Consulta inicial**: Se verifica primero si el tipo de cambio está en Redis
2. **Cache Hit**: Si existe y no ha expirado, se retorna directamente
3. **Cache Miss**: Si no existe, se consulta a la API externa
4. **Almacenamiento**: El nuevo valor se guarda en Redis con TTL
5. **Fallback**: Si la API falla, se usa el valor en caché (incluso si expiró)

## Configuración

### Variables de Entorno

Copia el archivo `.env.example` a `.env` y configura las variables:

```bash
cp .env.example .env
```

Variables disponibles:

```env
# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL=3600  # Tiempo de vida del caché en segundos (1 hora)

# Exchange Rate API
EXCHANGE_API_KEY=your_api_key_here
EXCHANGE_API_URL=https://v6.exchangerate-api.com/v6

# Server
SERVER_PORT=50057
DEFAULT_CURRENCY=USD
```

### Obtener API Key

1. Visita [ExchangeRate-API](https://www.exchangerate-api.com/)
2. Regístrate gratuitamente
3. Copia tu API key
4. Pégala en el archivo `.env`

**Plan gratuito**: 1,500 requests/mes

## Instalación

### Prerrequisitos

- Go 1.25+
- Protocol Buffers compiler (protoc)
- Redis

### Generar archivos Proto

```bash
# Instalar protoc plugins para Go
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Generar archivos .pb.go
cd Delivery-system
./generate-protos.sh  # En Linux/Mac
# o
.\generate-protos.ps1  # En Windows
```

### Ejecutar localmente

```bash
cd convert-service

# Instalar dependencias
go mod download

# Ejecutar servicio
go run cmd/server/main.go
```

### Ejecutar con Docker

```bash
# Desde el directorio Delivery-system
docker-compose up convert-service
```

## API (gRPC)

### GetExchangeRate

Obtiene el tipo de cambio entre dos monedas.

**Request:**
```protobuf
message GetExchangeRateRequest {
  string from_currency = 1; // e.g., "USD"
  string to_currency = 2;   // e.g., "GTQ"
}
```

**Response:**
```protobuf
message GetExchangeRateResponse {
  string from_currency = 1;
  string to_currency = 2;
  double rate = 3;
  int64 timestamp = 4;
  string source = 5; // "api", "cache", o "cache_fallback"
}
```

### ConvertCurrency

Convierte una cantidad de una moneda a otra.

**Request:**
```protobuf
message ConvertCurrencyRequest {
  string from_currency = 1;
  string to_currency = 2;
  double amount = 3;
}
```

**Response:**
```protobuf
message ConvertCurrencyResponse {
  string from_currency = 1;
  string to_currency = 2;
  double amount_from = 3;
  double amount_to = 4;
  double rate = 5;
  int64 timestamp = 6;
  string source = 7; // "api", "cache", o "cache_fallback"
}
```

## Ejemplos de Uso

### Usando grpcurl

```bash
# Obtener tipo de cambio USD a GTQ
grpcurl -plaintext -d '{
  "from_currency": "USD",
  "to_currency": "GTQ"
}' localhost:50057 convertpb.ConvertService/GetExchangeRate

# Convertir 100 USD a GTQ
grpcurl -plaintext -d '{
  "from_currency": "USD",
  "to_currency": "GTQ",
  "amount": 100
}' localhost:50057 convertpb.ConvertService/ConvertCurrency
```

### Desde otro servicio Go

```go
import (
    convertpb "delivery-proto/convertpb"
    "google.golang.org/grpc"
)

conn, _ := grpc.Dial("localhost:50057", grpc.WithInsecure())
defer conn.Close()

client := convertpb.NewConvertServiceClient(conn)

resp, err := client.ConvertCurrency(context.Background(), &convertpb.ConvertCurrencyRequest{
    FromCurrency: "USD",
    ToCurrency:   "GTQ",
    Amount:       100.00,
})

if err != nil {
    log.Fatal(err)
}

fmt.Printf("%.2f %s = %.2f %s (rate: %.4f, source: %s)\n",
    resp.AmountFrom, resp.FromCurrency,
    resp.AmountTo, resp.ToCurrency,
    resp.Rate, resp.Source)
```

## Monedas Soportadas

El servicio soporta todas las monedas disponibles en ExchangeRate-API, incluyendo:

- USD (Dólar estadounidense)
- GTQ (Quetzal guatemalteco)
- EUR (Euro)
- GBP (Libra esterlina)
- MXN (Peso mexicano)
- CAD (Dólar canadiense)
- ... y muchas más

## Logs

El servicio genera logs útiles para debugging:

```
Connected to Redis
Convert Service running on :50057
Cache hit for USD->GTQ
Cache miss for EUR->GBP, fetching from API
API failed, using stale cache as fallback for USD->MXN
```

## Testing

```bash
# Ejecutar tests
go test ./...

# Con coverage
go test -cover ./...
```

## Arquitectura

```
┌──────────────┐
│   gRPC       │
│   Client     │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────┐
│   ConvertService (Handler)       │
└──────────┬───────────────────────┘
           │
           ▼
┌──────────────────────────────────┐
│   ConvertService (Business)      │
│   - Coordina caché y API         │
│   - Implementa fallback          │
└──────┬───────────────────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐      ┌──────────────┐
│   Redis     │      │ ExchangeRate │
│   Cache     │      │     API      │
└─────────────┘      └──────────────┘
```

## Troubleshooting

### Redis no conecta

```bash
# Verificar que Redis está corriendo
docker ps | grep redis

# Ver logs de Redis
docker logs redis
```

### API retorna error

- Verifica que tu API key sea válida
- Revisa que no hayas excedido el límite de requests
- El servicio usará caché como fallback automáticamente

### Puerto en uso

```bash
# Cambiar SERVER_PORT en .env
SERVER_PORT=50058
```

## Licencia

Proyecto académico - Universidad de San Carlos de Guatemala
