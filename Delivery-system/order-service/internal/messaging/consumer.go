package messaging

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"order-service/internal/domain"
)

// OrderProcessor es la interfaz que el consumer usa para procesar una orden.
// El service la implementa, lo que evita importaciones circulares.
type OrderProcessor interface {
	ProcessOrder(ctx context.Context, order *domain.Order) error
}

// Consumer escucha la cola orders.pending y procesa cada orden con manual ACK.
// Si el procesamiento falla, hace Nack y la orden vuelve a la cola.
type Consumer struct {
	conn      *RabbitMQConn
	processor OrderProcessor
}

// NewConsumer crea un Consumer con la conexión y el processor inyectados.
func NewConsumer(conn *RabbitMQConn, processor OrderProcessor) *Consumer {
	return &Consumer{
		conn:      conn,
		processor: processor,
	}
}

// Start arranca el loop de consumo en la goroutine llamante.
// Llamar con: go consumer.Start()
func (c *Consumer) Start() {
	ch, err := c.conn.Channel()
	if err != nil {
		log.Fatalf("[Consumer] error abriendo canal: %v", err)
	}
	defer ch.Close()

	// Limitar a 1 mensaje a la vez: el consumer procesa una orden
	// antes de recibir la siguiente. Esto es lo que garantiza el ritmo propio.
	if err := ch.Qos(1, 0, false); err != nil {
		log.Fatalf("[Consumer] error configurando QoS: %v", err)
	}

	q, err := declareQueue(ch)
	if err != nil {
		log.Fatalf("[Consumer] error declarando cola: %v", err)
	}

	msgs, err := ch.Consume(
		q.Name,
		"order-service-consumer", // consumer tag identificable en el panel de RabbitMQ
		false,                    // auto-ack: false → manual ACK
		false,                    // exclusive
		false,                    // no-local
		false,                    // no-wait
		nil,
	)
	if err != nil {
		log.Fatalf("[Consumer] error registrando consumer: %v", err)
	}

	log.Printf("[Consumer] Escuchando cola '%s' con manual ACK...", QueueName)

	for msg := range msgs {
		c.handleMessage(msg.Body, func(ack bool) {
			if ack {
				// Procesamiento exitoso: confirmar y sacar de la cola
				if err := msg.Ack(false); err != nil {
					log.Printf("[Consumer] error en Ack: %v", err)
				}
			} else {
				// Procesamiento fallido: devolver a la cola para reintento
				// requeue=true para que RabbitMQ lo vuelva a entregar
				if err := msg.Nack(false, true); err != nil {
					log.Printf("[Consumer] error en Nack: %v", err)
				}
			}
		})
	}

	log.Println("[Consumer] Canal cerrado, el consumer se detuvo")
}

// handleMessage deserializa la orden y llama al processor.
// Recibe una función de callback para hacer Ack/Nack fuera de este método.
func (c *Consumer) handleMessage(body []byte, respond func(ack bool)) {
	var order domain.Order

	if err := json.Unmarshal(body, &order); err != nil {
		log.Printf("[Consumer] error deserializando mensaje (descartando): %v", err)
		// Mensaje malformado: Nack sin requeue para no entrar en bucle infinito
		respond(false)
		return
	}

	log.Printf("[Consumer] Procesando orden para cliente: %s | restaurante: %s | total: %.2f",
		order.ClienteNombre, order.RestauranteNombre, order.CostoTotal)

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := c.processor.ProcessOrder(ctx, &order); err != nil {
		log.Printf("[Consumer] error procesando orden (reencolar): %v", err)
		respond(false) // Nack → vuelve a la cola
		return
	}

	log.Printf("[Consumer] Orden procesada correctamente para cliente: %s", order.ClienteNombre)
	respond(true) // Ack → sacar de la cola
}
