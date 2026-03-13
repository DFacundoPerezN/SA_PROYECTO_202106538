package messaging

import (
	"encoding/json"
	"fmt"
	"log"

	"order-service/internal/domain"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Publisher publica órdenes en la cola de RabbitMQ.
// Usa la conexión persistente compartida en lugar de abrir una nueva por cada mensaje.
type Publisher struct {
	conn *RabbitMQConn
}

// NewPublisher crea un Publisher con la conexión inyectada.
func NewPublisher(conn *RabbitMQConn) *Publisher {
	return &Publisher{conn: conn}
}

// PublicarOrden serializa la orden y la publica en la cola orders.pending.
// Abre un canal por publicación (liviano) y lo cierra al terminar.
func (p *Publisher) PublicarOrden(order *domain.Order) error {
	ch, err := p.conn.Channel()
	if err != nil {
		return fmt.Errorf("[Publisher] error abriendo canal: %w", err)
	}
	defer ch.Close()

	q, err := declareQueue(ch)
	if err != nil {
		return fmt.Errorf("[Publisher] error declarando cola: %w", err)
	}

	body, err := json.Marshal(order)
	if err != nil {
		return fmt.Errorf("[Publisher] error serializando orden: %w", err)
	}

	err = ch.Publish(
		"",     // exchange directo
		q.Name, // routing key = nombre de la cola
		false,  // mandatory
		false,  // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent, // el mensaje sobrevive a reinicios de RabbitMQ
			Body:         body,
		},
	)
	if err != nil {
		return fmt.Errorf("[Publisher] error publicando en cola: %w", err)
	}

	log.Printf("[Publisher] Orden encolada en '%s' para cliente: %s", QueueName, order.ClienteNombre)
	return nil
}
