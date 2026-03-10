# ---------- BUILD STAGE ----------

FROM golang:1.25.6-alpine AS builder

RUN apk add --no-cache git protobuf protobuf-dev

# Instalar plugins gRPC
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

ENV PATH="$PATH:/go/bin"

WORKDIR /workspace

# Copiar archivos necesarios
COPY go.work ./
COPY proto ./proto
COPY user-service ./user-service

# Generar archivos proto
WORKDIR /workspace/proto/userpb
# Limpiar archivos proto antiguos y regenerar
RUN rm -f *.pb.go && protoc --go_out=paths=source_relative:. --go-grpc_out=paths=source_relative:. user.proto

# Actualizar módulo delivery-proto
WORKDIR /workspace/proto
RUN go mod tidy

# Compilar servicio
WORKDIR /workspace/user-service

# Actualizar el replace path a ruta absoluta
RUN sed -i 's|replace delivery-proto => ../proto|replace delivery-proto => /workspace/proto|' go.mod

# Desactivar workspace
ENV GOWORK=off

RUN go mod tidy
RUN go build -o user-server ./cmd/server

# ---------- RUNTIME ----------

FROM alpine:3.19

WORKDIR /app

COPY --from=builder /workspace/user-service/user-server .

EXPOSE 50052

CMD ["./user-server"]
