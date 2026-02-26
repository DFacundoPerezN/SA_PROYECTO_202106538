# ---------- BUILD STAGE ----------

FROM golang:1.25.6-alpine AS builder

RUN apk add --no-cache git protobuf protobuf-dev

# plugins gRPC

RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

ENV PATH="$PATH:/go/bin"

WORKDIR /workspace

# copiar monorepo necesario

COPY go.work ./
COPY proto ./proto
COPY catalog-service ./catalog-service

# generar stubs gRPC

WORKDIR /workspace/proto/catalogpb
RUN protoc --go_out=.. --go-grpc_out=.. catalog.proto

# compilar servicio

WORKDIR /workspace/catalog-service
ENV GOWORK=off
RUN go mod tidy
RUN go build -o catalog-server ./cmd/server

# ---------- RUNTIME ----------

FROM alpine:3.19

WORKDIR /app

COPY --from=builder /workspace/catalog-service/catalog-server .

EXPOSE 50053

CMD ["./catalog-server"]
