# ---------- BUILD STAGE ----------
FROM golang:1.25.6-alpine AS builder

RUN apk add --no-cache git protobuf protobuf-dev

# plugins gRPC
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

ENV PATH="$PATH:/go/bin"

WORKDIR /workspace

# copiamos lo necesario
COPY go.work ./
COPY proto ./proto
COPY gateaway ./gateaway
COPY auth-service ./auth-service
COPY catalog-service ./catalog-service
COPY convert-service ./convert-service
COPY notification-service ./notification-service
COPY order-service ./order-service
COPY restaurant-service ./restaurant-service
COPY user-service ./user-service

# generar stubs gRPC - auth
WORKDIR /workspace/proto/auth
RUN protoc --go_out=paths=source_relative:. --go-grpc_out=paths=source_relative:. auth.proto

# generar stubs gRPC - userpb
WORKDIR /workspace/proto/userpb
RUN protoc --go_out=paths=source_relative:. --go-grpc_out=paths=source_relative:. user.proto

# generar stubs gRPC - orderpb
WORKDIR /workspace/proto/orderpb
RUN protoc --go_out=paths=source_relative:. --go-grpc_out=paths=source_relative:. order.proto

# generar stubs gRPC - restaurantpb
WORKDIR /workspace/proto/restaurantpb
RUN protoc --go_out=paths=source_relative:. --go-grpc_out=paths=source_relative:. restaurant.proto

# generar stubs gRPC - catalogpb
WORKDIR /workspace/proto/catalogpb
RUN protoc --go_out=paths=source_relative:. --go-grpc_out=paths=source_relative:. catalog.proto

# generar stubs gRPC - notificationpb
WORKDIR /workspace/proto/notificationpb
RUN protoc --go_out=paths=source_relative:. --go-grpc_out=paths=source_relative:. notification.proto

# generar stubs gRPC - convertpb
WORKDIR /workspace/proto/convertpb
RUN protoc --go_out=paths=source_relative:. --go-grpc_out=paths=source_relative:. convert.proto

# compilar servicio
WORKDIR /workspace/gateaway

RUN go mod tidy
RUN go build -o api-gateway ./cmd/server

# ---------- RUNTIME ----------
FROM alpine:3.19

WORKDIR /app

COPY --from=builder /workspace/gateaway/api-gateway .

EXPOSE 8080

CMD ["./api-gateway"]