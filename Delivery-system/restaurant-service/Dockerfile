# ---------- BUILD STAGE ----------

FROM golang:1.25.6-alpine AS builder

RUN apk add --no-cache git protobuf protobuf-dev

# plugins gRPC (solo si generas protos dentro del contenedor)

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

ENV PATH="$PATH:/go/bin"

WORKDIR /workspace

# copiamos lo necesario

COPY go.work ./
COPY proto ./proto
COPY restaurant-service ./restaurant-service

# (Opcional) generar stubs si decides hacerlo aquí
WORKDIR /workspace/proto/restaurantpb
RUN protoc --go_out=. --go_opt=paths=source_relative \
           --go-grpc_out=. --go-grpc_opt=paths=source_relative \
           restaurant.proto

WORKDIR /workspace/restaurant-service

# desactivar workspace

ENV GOWORK=off

# Mostrar qué archivos hay (para debug)
RUN ls -la /workspace/proto/restaurantpb/

# Asegurar que go.mod tiene la referencia correcta
RUN go mod edit -replace delivery-proto/restaurantpb=/workspace/proto/restaurantpb

RUN go mod tidy
RUN go build -o restaurant-server ./cmd/server

# ---------- RUNTIME ----------

FROM alpine:3.19

WORKDIR /app

COPY --from=builder /workspace/restaurant-service/restaurant-server .

EXPOSE 50054

CMD ["./restaurant-server"]