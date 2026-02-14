module order-service

go 1.25.6

replace delivery-proto => ../proto

require (
	delivery-proto v0.0.0-00010101000000-000000000000
	github.com/denisenkom/go-mssqldb v0.12.3
	github.com/joho/godotenv v1.5.1
	google.golang.org/grpc v1.78.0
)

require (
	github.com/golang-sql/civil v0.0.0-20190719163853-cb61b32ac6fe // indirect
	github.com/golang-sql/sqlexp v0.1.0 // indirect
	golang.org/x/crypto v0.44.0 // indirect
	golang.org/x/net v0.47.0 // indirect
	golang.org/x/sys v0.38.0 // indirect
	golang.org/x/text v0.31.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20251029180050-ab9386a59fda // indirect
	google.golang.org/protobuf v1.36.11 // indirect
)
