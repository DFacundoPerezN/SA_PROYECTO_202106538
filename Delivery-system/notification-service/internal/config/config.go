package config

import "os"

type Config struct {
	SMTPHost string
	SMTPPort string
	SMTPUser string
	SMTPPass string
	From     string
}

func Load() *Config {
	return &Config{
		SMTPHost: os.Getenv("SMTP_HOST"),
		SMTPPort: os.Getenv("SMTP_PORT"),
		SMTPUser: os.Getenv("SMTP_USER"),
		SMTPPass: os.Getenv("SMTP_PASS"),
		From:     os.Getenv("SMTP_FROM"),
	}
}
