FROM golang:1.25-alpine AS builder

# Instalar herramientas necesarias
RUN apk add --no-cache git protobuf protobuf-dev

# Instalar protoc plugins
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest && \
    go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

ENV PATH="$PATH:/go/bin"

WORKDIR /workspace

# Copiar protos y convert-service
COPY proto ./proto
COPY convert-service ./convert-service

# Generar protobuf para convertpb
WORKDIR /workspace/proto/convertpb
RUN protoc --go_out=paths=source_relative:. --go-grpc_out=paths=source_relative:. convert.proto && ls -la

# Actualizar módulo delivery-proto
WORKDIR /workspace/proto
RUN go mod tidy

# IMPORTANTE: actualizar el replace path a ruta absoluta
WORKDIR /workspace/convert-service  
RUN sed -i 's|replace delivery-proto => ../proto|replace delivery-proto => /workspace/proto|' go.mod && \
    cat go.mod

# Limpiar caché y compilar convert-service
RUN go clean -modcache && \
    go mod tidy && \
    CGO_ENABLED=0 GOOS=linux go build -o convert-service ./cmd/server

# Stage final
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copiar binario
COPY --from=builder /workspace/convert-service/convert-service .

# Exponer puerto
EXPOSE 50057

CMD ["./convert-service"]
