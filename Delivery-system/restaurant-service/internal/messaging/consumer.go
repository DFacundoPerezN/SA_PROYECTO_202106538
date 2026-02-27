package messaging

import (
	"encoding/json"
	"fmt"
	"log"
	"time"

	"restaurant-service/internal/domain"

	amqp "github.com/rabbitmq/amqp091-go"
)

func connectRabbitMQ() *amqp.Connection {
	var conn *amqp.Connection
	var err error

	for range 6 {
		conn, err = amqp.Dial("amqp://guest:guest@rabbitmq:5672/")
		if err == nil {
			log.Println("Conectado a RabbitMQ")
			return conn
		}

		log.Println("RabbitMQ no disponible, reintentando en 5s...")
		time.Sleep(5 * time.Second)
	}

	log.Fatal("No se pudo conectar a RabbitMQ:", err)
	return nil
}

func ConsumirOrdenes() {
	conn := connectRabbitMQ()

	defer conn.Close()
	fmt.Print("Alcancando comunicacion con RabbitMQ")

	ch, err := conn.Channel()
	if err != nil {
		log.Fatal(err)
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
		log.Fatal(err)
	}

	msgs, err := ch.Consume(
		q.Name,
		"",
		true, // auto-ack
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Fatal(err)
	}

	log.Println("Esperando órdenes...")

	forever := make(chan bool)

	go func() {
		for d := range msgs {
			var order domain.Order

			err := json.Unmarshal(d.Body, &order)
			if err != nil {
				log.Println("Error parseando orden:", err)
				continue
			}

			log.Println("Nueva orden recibida: #", order.Id)
			log.Printf("Cliente: %s\n", order.ClienteNombre)
			log.Printf("Restaurante: %s\n", order.RestauranteNombre)
			for _, item := range order.Items {
				log.Printf("Item: %s\n", item.NombreProducto)
			}
			log.Printf("Total: %.2f\n", order.CostoTotal)
		}
	}()

	<-forever
}
