# Convert Service - Documentacion Tecnica

## 1. Objetivo
`convert-service` expone un servicio gRPC para:
- Consultar tasa de cambio entre dos monedas (`GetExchangeRate`)
- Convertir un monto entre monedas (`ConvertCurrency`)

La fuente principal de datos es ExchangeRate-API. Redis se usa como cache para reducir latencia y dependencias directas a la API externa.

## 2. Ubicacion y contexto
- Modulo: `Delivery-system/convert-service`
- Puerto gRPC: `50057`
- Integracion en Compose: `Delivery-system/docker-compose.yml`
- Contrato protobuf: `Delivery-system/proto/convertpb/convert.proto`
- Cliente en gateway: `Delivery-system/gateaway/internal/grpc/convert_client.go`

## 3. Stack tecnico
- Go `1.25.6`
- gRPC: `google.golang.org/grpc`
- Redis client: `github.com/go-redis/redis/v8`
- Carga de variables de entorno: `github.com/joho/godotenv`
- API externa: `https://v6.exchangerate-api.com/v6`

## 4. Arquitectura interna

### 4.1 Componentes
- `cmd/server/main.go`
  - Carga `.env` y configuracion
  - Inicializa Redis, cliente HTTP externo y servicio
  - Levanta servidor gRPC y registra `ConvertService`
- `internal/config/config.go`
  - Resuelve variables de entorno con defaults
- `internal/cache/redis.go`
  - Implementa acceso a Redis (`Get`, `Set`, `Ping`)
  - Normaliza `Source = "cache"` al leer de cache
- `internal/client/exchangerate_client.go`
  - Implementa cliente HTTP hacia ExchangeRate-API
  - Timeout de `10s`
- `internal/service/convert_service.go`
  - Regla de negocio principal y estrategia cache-first
- `internal/handler/grpc/convert_handler.go`
  - Valida request gRPC y adapta respuesta de dominio a protobuf
- `internal/domain/exchange_rate.go`
  - Modelos de dominio para tasa y respuesta de API externa

### 4.2 Flujo de datos
1. Cliente llama RPC en `ConvertService`.
2. Handler valida input (`from_currency`, `to_currency`, `amount > 0`).
3. Service intenta leer tasa desde Redis.
4. Si hay cache hit, responde inmediatamente.
5. Si no hay cache, consulta ExchangeRate-API.
6. Si API responde, guarda en Redis con TTL configurable y retorna.
7. Si API falla, retorna error.

Nota: El codigo intenta fallback a cache cuando falla API, pero en la implementacion actual ese fallback no se activa porque el valor cacheado es `nil` cuando hay cache miss.

## 5. Contrato gRPC (fuente de verdad)
Definido en `Delivery-system/proto/convertpb/convert.proto`:

- Servicio: `ConvertService`
- RPCs:
  - `GetExchangeRate(GetExchangeRateRequest) returns (GetExchangeRateResponse)`
  - `ConvertCurrency(ConvertCurrencyRequest) returns (ConvertCurrencyResponse)`

Campos relevantes:
- Request `GetExchangeRateRequest`:
  - `from_currency` (string)
  - `to_currency` (string)
- Request `ConvertCurrencyRequest`:
  - `from_currency` (string)
  - `to_currency` (string)
  - `amount` (double)
- Response:
  - `rate`, `timestamp`, `source`
  - `source` esperado: `api`, `cache`, `cache_fallback`

## 6. Configuracion
Variables esperadas (`.env`):

- `REDIS_HOST` (default: `localhost`)
- `REDIS_PORT` (default: `6379`)
- `REDIS_PASSWORD` (default: vacio)
- `REDIS_DB` (default: `0`)
- `CACHE_TTL` en segundos (default: `3600`)
- `EXCHANGE_API_KEY` (obligatoria en runtime)
- `EXCHANGE_API_URL` (default: `https://v6.exchangerate-api.com/v6`)
- `SERVER_PORT` (default: `50057`)
- `DEFAULT_CURRENCY` (default: `USD`, actualmente no se usa en logica)

## 7. Integracion con el sistema

### 7.1 Docker Compose
`Delivery-system/docker-compose.yml` define:
- servicio `convert-service`
- `depends_on: redis`
- mapeo `50057:50057`
- `env_file: ./convert-service/.env`

### 7.2 API Gateway (REST -> gRPC)
`Delivery-system/gateaway/cmd/server/main.go` conecta con `convert-service:50057`.

Rutas REST publicas:
- `GET /api/convert/exchange-rate?from=USD&to=GTQ`
- `POST /api/convert/currency`

Estas rutas delegan en el cliente gRPC de `Delivery-system/gateaway/internal/grpc/convert_client.go`.

## 8. Manejo de errores
- Validaciones de entrada en handler:
  - Monedas vacias -> `InvalidArgument`
  - Monto <= 0 -> `InvalidArgument`
- Redis con errores de lectura/escritura:
  - Se loggea warning y el flujo continua cuando es posible
- API externa:
  - error de red, status no 200, parse, moneda inexistente
- Si no hay API key configurada:
  - se retorna error explicito (`exchange API key is not configured`)

## 9. Performance y resiliencia
- Cache Redis reduce llamadas repetitivas a API externa
- TTL configurable por entorno
- Servicio stateless (estado compartido en Redis)
- Timeout de cliente HTTP externo: `10s`

## 10. Observabilidad actual
- Logging con `log.Printf` en puntos clave:
  - cache hit/miss
  - errores de cache
  - errores de API
- No hay metricas ni tracing instrumentados en esta version

## 11. Riesgos tecnicos conocidos

### 11.1 Desfase entre proto y codigo generado
Estado actual detectado:
- `convert.proto` define mensajes `GetExchangeRateRequest` y `ConvertCurrencyRequest`
- `convert.pb.go` / `convert_grpc.pb.go` actuales exponen tipos antiguos (`ExchangeRateRequest`, `ConversionRequest`)

Impacto:
- `go test ./...` falla en `internal/handler/grpc` por tipos no definidos

Accion recomendada:
- Regenerar archivos protobuf desde `convert.proto` (ver guia de implementacion)

### 11.2 Clave de API en archivo versionado
Se detecto una clave en `.env`. Recomendado:
- rotar la key
- removerla de control de versiones
- usar secretos por entorno

## 12. Mejoras recomendadas
- Corregir fallback a cache stale cuando API falla
- Mapear errores internos a codigos gRPC consistentes (`codes.Internal`, `codes.Unavailable`)
- Agregar tests unitarios en `service` y `handler`
- Agregar health check de Redis/API
- Instrumentar metricas (latencia, cache hit ratio, errores externos)
