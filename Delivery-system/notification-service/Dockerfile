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
COPY notification-service ./notification-service

# (Opcional) generar stubs si decides hacerlo aquí

WORKDIR /workspace/proto/notificationpb
RUN protoc --go_out=.. --go-grpc_out=.. notification.proto

# compilar servicio

WORKDIR /workspace/notification-service

# desactivar workspace

ENV GOWORK=off

RUN go mod tidy
RUN go build -o notification-server ./cmd/server

# ---------- RUNTIME ----------

FROM alpine:3.19

WORKDIR /app

COPY --from=builder /workspace/notification-service/notification-server .

EXPOSE 50056

CMD ["./notification-server"]
