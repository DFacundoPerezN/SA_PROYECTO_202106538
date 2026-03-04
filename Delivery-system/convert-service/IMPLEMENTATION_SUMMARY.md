# ✅ Convert Service - Resumen de Implementación

## 🎯 Funcionalidades Implementadas

✅ **Consumo de API Externa**
- Cliente HTTP para ExchangeRate-API
- Manejo de errores y timeouts
- Soporte para 161+ monedas

✅ **Caché con Redis**
- Implementación completa con Redis
- TTL configurable (por defecto 1 hora)
- Fallback automático cuando la API falla

✅ **Lógica de Negocio**
- Consulta primero en Redis (caché)
- Si no existe, consulta a la API externa
- Guarda el resultado en caché
- Si la API falla, usa el valor en caché (fallback)

✅ **Arquitectura gRPC**
- 2 métodos RPC implementados:
  - `GetExchangeRate`: Obtener tasa de cambio
  - `ConvertCurrency`: Convertir montos entre monedas

## 📁 Estructura Creada

```
convert-service/
├── cmd/
│   └── server/
│       └── main.go                    # Punto deentrada
├── internal/
│   ├── cache/
│   │   └── redis.go                   # Cliente Redis con caché
│   ├── client/
│   │   └── exchangerate_client.go     # Cliente API externa
│   ├── config/
│   │   └── config.go                  # Configuración
│   ├── domain/
│   │   └── exchange_rate.go           # Modelos de dominio
│   ├── handler/
│   │   └── grpc/
│   │       └── convert_handler.go     # Handler gRPC
│   └── service/
│       └── convert_service.go         # Lógica de negocio
├── .env                               # Variables de entorno
├── .env.example                       # Plantilla de variables
├── .gitignore                         # Ignorar archivos
├── API_KEY_SETUP.md                   # Guía para obtener API key
├── Dockerfile                         # Imagen Docker
├── go.mod                             # Dependencias Go
├── QUICKSTART.md                      # Guía rápida
└── README.md                          # Documentación completa
```

## 📦 Archivos Proto Generados

```
proto/convertpb/
├── convert.proto          # Definición protobuf
├── convert.pb.go         # Mensajes generados
└── convert_grpc.pb.go    # Servicio gRPC generado
```

## 🔧 Configuración en Docker Compose

Agregado en `docker-compose.yml`:
```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"

convert-service:
  build:
    context: .
    dockerfile: convert-service/Dockerfile
  ports:
    - "50057:50057"
  depends_on:
    - redis
```

## 🔑 Variables de Entorno

```env
# Redis
REDIS_HOST=redis
REDIS_PORT=6379
CACHE_TTL=3600

# API Externa
EXCHANGE_API_KEY=        # ⚠️ CONFIGURAR ESTO
EXCHANGE_API_URL=https://v6.exchangerate-api.com/v6

# Servidor
SERVER_PORT=50057
DEFAULT_CURRENCY=USD
```

## 🚀 Cómo Usar

### 1. Obtener API Key
```bash
# Visitar: https://www.exchangerate-api.com/
# Registrarse y copiar la API key
```

### 2. Configurar
```bash
cd Delivery-system/convert-service
nano .env  # Agregar EXCHANGE_API_KEY=tu_key_aqui
```

### 3. Ejecutar con Docker
```bash
cd ..
docker-compose up convert-service
```

### 4. Probar
```bash
grpcurl -plaintext -d '{
  "from_currency": "USD",
  "to_currency": "GTQ",
  "amount": 100
}' localhost:50057 convertpb.ConvertService/ConvertCurrency
```

## 📊 Flujo de Datos

```
Cliente gRPC
    ↓
ConvertHandler
    ↓
ConvertService
    ↓
    ├─→ [1] Redis Cache (consulta)
    │       ↓
    │   ¿Existe y es válido?
    │       ├─→ SÍ → Retornar (source: "cache")
    │       └─→ NO → Continuar
    ↓
    ├─→ [2] ExchangeRate API (consulta)
    │       ↓
    │   ¿Éxito?
    │       ├─→ SÍ → Guardar en Redis → Retornar (source: "api")
    │       └─→ NO → Continuar
    ↓
    └─→ [3] Redis Cache (fallback)
            ↓
        ¿Existe valor antiguo?
            ├─→ SÍ → Retornar (source: "cache_fallback")
            └─→ NO → Error
```

## 🧪 Testing

```bash
# Compilar
go build -o convert-service.exe ./cmd/server

# Ejecutar
./convert-service.exe

# En otra terminal, probar con grpcurl
grpcurl -plaintext \
  -d '{"from_currency":"USD","to_currency":"GTQ"}' \
  localhost:50057 \
  convertpb.ConvertService/GetExchangeRate
```

## 📝 Dependencias Principales

- `github.com/go-redis/redis/v8` - Cliente Redis
- `google.golang.org/grpc` - Framework gRPC
- `github.com/joho/godotenv` - Cargar variables .env

## ⚙️ Características Técnicas

1. **Resiliencia**:
   - Fallback a caché cuando API falla
   - Timeouts configurables
   - Manejo de errores robusto

2. **Performance**:
   - Caché en memoria (Redis)
   - TTL configurable
   - Consultas optimizadas

3. **Escalabilidad**:
   - Arquitectura de microservicios
   - Stateless (estado en Redis)
   - Containerizado con Docker

4. **Mantenibilidad**:
   - Código bien estructurado
   - Inyección de dependencias
   - Logging detallado

## 🎓 Próximos Pasos

1. ✅ Servicio funcionando localmente
2. 📝 Obtener API key de ExchangeRate-API
3. 🐳 Levantar con Docker Compose
4. 🌐 Integrar con API Gateway
5. 📊 Agregar métricas y monitoring
6. 🧪 Implementar tests unitarios
7. 📦 Publicar imagen en Docker Hub

## 🔗 Referencias

- [README completo](README.md)
- [Guía rápida](QUICKSTART.md)
- [Setup API Key](API_KEY_SETUP.md)
- [ExchangeRate-API Docs](https://www.exchangerate-api.com/docs)

---

**¡El servicio está listo para usar! 🎉**

Solo falta configurar la API key y ejecutar `docker-compose up convert-service`
