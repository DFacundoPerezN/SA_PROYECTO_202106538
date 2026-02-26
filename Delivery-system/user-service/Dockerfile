# ---------- BUILD STAGE ----------

FROM golang:1.25.6-alpine AS builder

RUN apk add --no-cache git

WORKDIR /workspace

# Copiar TODO el monorepo (necesario por go.work)

COPY . .

# Entrar al servicio

WORKDIR /workspace/user-service

# Sincronizar workspace

RUN go work sync

# Descargar dependencias

RUN go mod tidy

# Compilar binario

RUN go build -o user-server ./cmd/server

# ---------- RUNTIME ----------

FROM alpine:3.19

WORKDIR /app

COPY --from=builder /workspace/user-service/user-server .

EXPOSE 50052

CMD ["./user-server"]
