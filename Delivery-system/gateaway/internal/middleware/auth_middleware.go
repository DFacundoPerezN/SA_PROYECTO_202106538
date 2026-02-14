package middleware

import (
	"net/http"
	"strings"

	"api-gateway/internal/grpc"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(authClient *grpc.AuthClient) gin.HandlerFunc {
	return func(c *gin.Context) {

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			c.Abort()
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token format"})
			c.Abort()
			return
		}

		token := parts[1]

		claims, err := authClient.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			c.Abort()
			return
		}

		// Guardar usuario en contexto
		c.Set("user_id", int(claims.UserId))
		c.Set("email", claims.Email)
		c.Set("role", string(claims.Rol))
		c.Next()
	}
}
