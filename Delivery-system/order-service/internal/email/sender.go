package email

import (
	"fmt"
	"net/smtp"
	"os"
)

type EmailSender struct {
	host     string
	port     string
	username string
	password string
	from     string
}

func NewEmailSender() *EmailSender {
	return &EmailSender{
		host:     os.Getenv("SMTP_HOST"),
		port:     os.Getenv("SMTP_PORT"),
		username: os.Getenv("SMTP_USER"),
		password: os.Getenv("SMTP_PASS"),
		from:     os.Getenv("SMTP_FROM"),
	}
}

func (e *EmailSender) Send(to, subject, body string) error {
	auth := smtp.PlainAuth("", e.username, e.password, e.host)

	msg := "From: " + e.from + "\n" +
		"To: " + to + "\n" +
		"Subject: " + subject + "\n\n" +
		body

	return smtp.SendMail(
		fmt.Sprintf("%s:%s", e.host, e.port),
		auth,
		e.from,
		[]string{to},
		[]byte(msg),
	)
}
