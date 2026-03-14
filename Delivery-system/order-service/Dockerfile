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
COPY order-service ./order-service

# (Opcional) generar stubs si decides hacerlo aquí

WORKDIR /workspace/proto/orderpb
RUN protoc --go_out=. --go_opt=paths=source_relative \
           --go-grpc_out=. --go-grpc_opt=paths=source_relative \
           order.proto


WORKDIR /workspace/order-service

# desactivar workspace

ENV GOWORK=off

# Mostrar qué archivos hay (para debug)
RUN ls -la /workspace/proto/orderpb/

# Asegurar que go.mod tiene la referencia correcta
RUN go mod edit -replace delivery-proto/orderpb=/workspace/proto/orderpb

RUN go mod tidy
RUN go build -o order-server ./cmd/server

# ---------- RUNTIME ----------

FROM alpine:3.19

WORKDIR /app

COPY --from=builder /workspace/order-service/order-server .

EXPOSE 50055

CMD ["./order-server"]
