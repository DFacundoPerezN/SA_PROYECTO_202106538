# ---------- BUILD STAGE ----------

FROM golang:1.25.6-alpine AS builder

RUN apk add --no-cache git protobuf protobuf-dev

# instalar plugins

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

ENV PATH="$PATH:/go/bin"

WORKDIR /app

# copiar proto

COPY proto ./proto

# copiar SOLO el servicio

COPY auth-service ./auth-service

# generar stubs

WORKDIR /app/proto/auth
RUN protoc --go_out=. --go-grpc_out=. auth.proto

# ahora entramos al servicio

WORKDIR /app/auth-service

# MUY IMPORTANTE: desactivar workspace

ENV GOWORK=off

RUN go mod tidy
RUN go build -o auth-server ./cmd/server

# ---------- RUNTIME ----------

FROM alpine:3.19

WORKDIR /app
COPY --from=builder /app/auth-service/auth-server .

EXPOSE 50051
CMD ["./auth-server"]
