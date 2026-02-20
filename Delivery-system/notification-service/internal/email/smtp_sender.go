package email

import (
	"fmt"
	"net/smtp"
)

type SMTPSender struct {
	host string
	port string
	user string
	pass string
	from string
}

func NewSMTPSender(host, port, user, pass, from string) *SMTPSender {
	return &SMTPSender{
		host: host,
		port: port,
		user: user,
		pass: pass,
		from: from,
	}
}

func (s *SMTPSender) Send(to, subject, body string) error {

	auth := smtp.PlainAuth("", s.user, s.pass, s.host)

	msg := []byte(fmt.Sprintf(
		"From: %s\r\nTo: %s\r\nSubject: %s\r\n\r\n%s",
		s.from, to, subject, body,
	))

	return smtp.SendMail(
		s.host+":"+s.port,
		auth,
		s.from,
		[]string{to},
		msg,
	)

}
