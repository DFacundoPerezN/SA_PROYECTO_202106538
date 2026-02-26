# ---------- BUILD STAGE ----------

FROM golang:1.25.6-alpine AS builder

RUN apk add --no-cache git protobuf protobuf-dev

# instalar plugins

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

ENV PATH="$PATH:/go/bin"

WORKDIR /workspace

# copiar monorepo necesario

COPY go.work ./
COPY proto ./proto
COPY gateaway ./api-gateway

# ===== GENERAR PROTOS (UNO POR UNO) =====

WORKDIR /workspace/proto/auth
RUN protoc --go_out=. --go-grpc_out=. auth.proto

WORKDIR /workspace/proto/userpb
RUN protoc --go_out=. --go-grpc_out=. user.proto

WORKDIR /workspace/proto/orderpb
RUN protoc --go_out=. --go-grpc_out=. order.proto

WORKDIR /workspace/proto/restaurantpb
RUN protoc --go_out=. --go-grpc_out=. restaurant.proto

WORKDIR /workspace/proto/catalogpb
RUN protoc --go_out=. --go-grpc_out=. catalog.proto

WORKDIR /workspace/proto/notificationpb
RUN protoc --go_out=. --go-grpc_out=. notification.proto

# ===== COMPILAR GATEWAY =====

WORKDIR /workspace/api-gateway

# muy importante para monorepo

ENV GOWORK=off

RUN go mod tidy
RUN go build -o api-gateway ./cmd/server

# ---------- RUNTIME ----------

FROM alpine:3.19

WORKDIR /app

COPY --from=builder /workspace/api-gateway/api-gateway .

EXPOSE 8080

CMD ["./api-gateway"]
