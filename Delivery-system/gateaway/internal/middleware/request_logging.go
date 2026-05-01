package middleware

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

type requestLogEntry struct {
	Timestamp  string `json:"timestamp"`
	Level      string `json:"level"`
	Service    string `json:"service"`
	Method     string `json:"method"`
	Path       string `json:"path"`
	StatusCode int    `json:"status_code"`
	LatencyMS  int64  `json:"latency_ms"`
	ClientIP   string `json:"client_ip"`
	UserAgent  string `json:"user_agent,omitempty"`
	RequestID  string `json:"request_id,omitempty"`
	Message    string `json:"message"`
}

func JSONRequestLogger(serviceName string) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()

		statusCode := c.Writer.Status()
		level := "info"
		message := "request completed"
		if statusCode >= 500 {
			level = "error"
			message = "request failed"
		} else if statusCode >= 400 {
			level = "warn"
			message = "request returned client error"
		}

		entry := requestLogEntry{
			Timestamp:  time.Now().UTC().Format(time.RFC3339Nano),
			Level:      level,
			Service:    serviceName,
			Method:     c.Request.Method,
			Path:       c.FullPath(),
			StatusCode: statusCode,
			LatencyMS:  time.Since(start).Milliseconds(),
			ClientIP:   c.ClientIP(),
			UserAgent:  c.Request.UserAgent(),
			RequestID:  c.GetHeader("X-Request-Id"),
			Message:    message,
		}

		payload, err := json.Marshal(entry)
		if err != nil {
			log.Printf(`{"service":"%s","level":"error","message":"failed to marshal request log","error":"%v"}`, serviceName, err)
			return
		}

		log.Print(string(payload))
	}
}
