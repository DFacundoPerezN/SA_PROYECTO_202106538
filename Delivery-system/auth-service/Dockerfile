# ---------- BUILD STAGE ----------

FROM golang:1.25.6-alpine AS builder

RUN apk add --no-cache git protobuf protobuf-dev

# instalar plugins

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

ENV PATH="$PATH:/go/bin"

WORKDIR /workspace

# copiar proto

COPY go.work ./
COPY proto ./proto
COPY auth-service ./auth-service

WORKDIR /workspace/proto/auth
RUN protoc --go_out=. --go_opt=paths=source_relative \
           --go-grpc_out=. --go-grpc_opt=paths=source_relative \
           auth.proto

WORKDIR /workspace/auth-service

# desactivar workspace

ENV GOWORK=off

# Mostrar qué archivos hay (para debug)
RUN ls -la /workspace/proto/auth/

# Asegurar que go.mod tiene la referencia correcta
RUN go mod edit -replace delivery-proto/auth=/workspace/proto/auth

RUN go mod tidy
RUN go build -o auth-server ./cmd/server

# MUY IMPORTANTE: desactivar workspace

ENV GOWORK=off

RUN go mod tidy
RUN go build -o auth-server ./cmd/server

# ---------- RUNTIME ----------

FROM alpine:3.19

WORKDIR /app

COPY --from=builder /workspace/auth-service/auth-server .

EXPOSE 50051

CMD ["./auth-server"]