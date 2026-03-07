# Convert Service - Guia de Implementacion

## 1. Proposito
Esta guia describe como implementar, configurar, ejecutar y validar `convert-service` en el contexto de `Delivery-system`.


## 2. Prerequisitos
- Go `1.25.x`
- Docker y Docker Compose
- `protoc`
- Plugins:
  - `protoc-gen-go`
  - `protoc-gen-go-grpc`
- API key de ExchangeRate-API (`EXCHANGE_API_KEY`)

## 3. Estructura relevante
- Servicio: `Delivery-system/convert-service`
- Protobuf: `Delivery-system/proto/convertpb/convert.proto`
- Shared proto module: `Delivery-system/proto/go.mod`
- Workspace Go: `Delivery-system/go.work`
- Compose: `Delivery-system/docker-compose.yml`
- Gateway consumidor: `Delivery-system/gateaway`

## 4. Paso 1 - Configurar variables de entorno
Ubicarse en:
`Delivery-system/convert-service`

Crear o actualizar `.env` desde `.env.example` con los valores correctos:

```env
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
CACHE_TTL=3600
EXCHANGE_API_KEY=your_real_api_key
EXCHANGE_API_URL=https://v6.exchangerate-api.com/v6
SERVER_PORT=50057
DEFAULT_CURRENCY=USD
```


 

## 5. Paso 2 - Validar compilacion del servicio
En PowerShell:

```powershell
Set-Location "h:\Usac\SA\SA_PROYECTO_202106538\Delivery-system\convert-service"
go test ./...
```

Si falla por tipos protobuf no encontrados, repetir Paso 2.

## 6. Paso 3 - Ejecutar dependencias (Redis)
Opcion A, solo Redis:

```powershell
Set-Location "h:\Usac\SA\SA_PROYECTO_202106538\Delivery-system"
docker compose up -d redis
```

Opcion B, stack completo:

```powershell
Set-Location "h:\Usac\SA\SA_PROYECTO_202106538\Delivery-system"
docker compose up -d
```

## 7. Paso 4 - Ejecutar convert-service
Con Go (modo local):

```powershell
Set-Location "h:\Usac\SA\SA_PROYECTO_202106538\Delivery-system\convert-service"
go run ./cmd/server
```

Con Docker Compose (servicio containerizado):

```powershell
Set-Location "h:\Usac\SA\SA_PROYECTO_202106538\Delivery-system"
docker compose up -d convert-service
```

## 8. Paso 5 - Pruebas funcionales

### 8.1 Probar gRPC directo con grpcurl
Obtener tasa:

```bash
grpcurl -plaintext -d '{"from_currency":"USD","to_currency":"GTQ"}' localhost:50057 convertpb.ConvertService/GetExchangeRate
```

Convertir monto:

```bash
grpcurl -plaintext -d '{"from_currency":"USD","to_currency":"GTQ","amount":100}' localhost:50057 convertpb.ConvertService/ConvertCurrency
```

Resultado esperado:
- Respuesta con `rate`, `timestamp`, `source`
- `source` puede ser `api`, `cache` o `cache_fallback`

### 8.2 Probar REST via gateway
Requiere gateway en ejecucion y conectado al stack.

GET tasa:

```bash
curl "http://localhost:8080/api/convert/exchange-rate?from=USD&to=GTQ"
```

POST conversion:

```bash
curl -X POST "http://localhost:8080/api/convert/currency" \
  -H "Content-Type: application/json" \
  -d '{"from_currency":"USD","to_currency":"GTQ","amount":100}'
```

## 9. Guia de implementacion por capas

### 9.1 Capa de contrato
- Definir RPCs y mensajes en `proto/convertpb/convert.proto`.
- Regenerar `convert.pb.go` y `convert_grpc.pb.go`.

### 9.2 Capa de dominio
- Estructuras de negocio en `internal/domain/exchange_rate.go`.

### 9.3 Capa de infraestructura
- Cliente API externa en `internal/client/exchangerate_client.go`.
- Cache Redis en `internal/cache/redis.go`.

### 9.4 Capa de servicio
- Reglas de negocio en `internal/service/convert_service.go`.
- Flujo recomendado: cache -> API -> fallback.

### 9.5 Capa de transporte
- Handler gRPC en `internal/handler/grpc/convert_handler.go`.
- Validaciones de request y adaptacion de respuesta.

### 9.6 Bootstrap
- Wiring e inyeccion de dependencias en `cmd/server/main.go`.

## 10. Troubleshooting

### Error: undefined convertpb.GetExchangeRateRequest
Causa:
- protobuf desactualizado respecto a `convert.proto`

Solucion:
- ejecutar Paso 2 completo

### Error: exchange API key is not configured
Causa:
- variable `EXCHANGE_API_KEY` vacia o ausente

Solucion:
- actualizar `.env` y reiniciar servicio

### Error: failed to connect to Redis
Causa:
- Redis no disponible o host/puerto incorrectos

Solucion:
- levantar Redis con Compose
- validar `REDIS_HOST`, `REDIS_PORT`, `REDIS_DB`

### API externa responde error HTTP
Causa:
- key invalida, limite de uso o problema de red

Solucion:
- validar key
- revisar conectividad saliente
- revisar logs de servicio

## 11. Checklist de salida a produccion
- [ ] `EXCHANGE_API_KEY` manejada como secreto (no en repositorio)
- [ ] protobuf regenerado y versionado
- [ ] `go test ./...` exitoso
- [ ] Redis accesible desde contenedor/app
- [ ] smoke tests gRPC y REST exitosos
- [ ] logs verificados para cache hit/miss y errores API
