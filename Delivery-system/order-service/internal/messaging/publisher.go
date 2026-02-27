package messaging

import (
	"encoding/json"
	"log"

	"order-service/internal/domain"

	amqp "github.com/rabbitmq/amqp091-go"
)

func PublicarOrden(event *domain.Order) error {
	conn, err := amqp.Dial("amqp://guest:guest@rabbitmq:5672/")
	if err != nil {
		return err
	}
	defer conn.Close()

	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	q, err := ch.QueueDeclare(
		"orden.creada",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return err
	}
	log.Printf("Intentando publicar orden en la cola")
	body, _ := json.Marshal(event)

	err = ch.Publish(
		"",
		q.Name,
		false,
		false,
		amqp.Publishing{
			ContentType: "application/json",
			Body:        body,
		},
	)

	if err == nil {
		log.Println("¡Evento publicado en RabbitMQ! :o")
	}

	return err
}
