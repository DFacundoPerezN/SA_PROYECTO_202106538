package messaging

import (
	"log"
	"os"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	QueueName   = "orders.pending"
	maxRetries  = 10
	retryDelay  = 5 * time.Second
)

// RabbitMQConn es la conexión compartida entre publisher y consumer.
type RabbitMQConn struct {
	conn *amqp.Connection
}

// NewRabbitMQConn establece la conexión a RabbitMQ con reintentos.
// Se lanza al arrancar el servicio y se inyecta en publisher y consumer.
func NewRabbitMQConn() (*RabbitMQConn, error) {
	url := os.Getenv("RABBITMQ_URL")
	if url == "" {
		url = "amqp://guest:guest@rabbitmq:5672/"
	}

	var conn *amqp.Connection
	var err error

	for i := range maxRetries {
		conn, err = amqp.Dial(url)
		if err == nil {
			log.Println("[RabbitMQ] Conexión establecida")
			return &RabbitMQConn{conn: conn}, nil
		}
		log.Printf("[RabbitMQ] Intento %d/%d fallido, reintentando en %s: %v",
			i+1, maxRetries, retryDelay, err)
		time.Sleep(retryDelay)
	}

	return nil, err
}

// Channel abre un canal sobre la conexión existente.
func (r *RabbitMQConn) Channel() (*amqp.Channel, error) {
	return r.conn.Channel()
}

// Close cierra la conexión limpiamente al apagar el servicio.
func (r *RabbitMQConn) Close() {
	if r.conn != nil && !r.conn.IsClosed() {
		r.conn.Close()
		log.Println("[RabbitMQ] Conexión cerrada")
	}
}

// declareQueue declara la cola de forma idempotente en el canal dado.
// Se llama tanto desde el publisher como desde el consumer para garantizar
// que la cola existe antes de publicar o consumir.
func declareQueue(ch *amqp.Channel) (amqp.Queue, error) {
	return ch.QueueDeclare(
		QueueName,
		true,  // durable: sobrevive a reinicios de RabbitMQ
		false, // auto-delete: no se elimina cuando no hay consumers
		false, // exclusive: accesible desde otras conexiones
		false, // no-wait
		nil,
	)
}
