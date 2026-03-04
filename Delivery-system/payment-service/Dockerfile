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
COPY payment-service ./payment-service

# (Opcional) generar stubs si decides hacerlo aquí

WORKDIR /workspace/proto/paymentpb
RUN protoc --go_out=.. --go-grpc_out=.. payment.proto

# compilar servicio

WORKDIR /workspace/payment-service

# desactivar workspace

ENV GOWORK=off

RUN go mod tidy
RUN go build -o payment-server ./cmd/server

# ---------- RUNTIME ----------

FROM alpine:3.19

WORKDIR /app

COPY --from=builder /workspace/payment-service/payment-server .

EXPOSE 50058

CMD ["./payment-server"]
