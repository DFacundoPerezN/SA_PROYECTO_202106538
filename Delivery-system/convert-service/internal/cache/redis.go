package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"convert-service/internal/domain"

	"github.com/go-redis/redis/v8"
)

type RedisCache interface {
	Get(ctx context.Context, key string) (*domain.ExchangeRate, error)
	Set(ctx context.Context, key string, rate *domain.ExchangeRate, ttl time.Duration) error
	Ping(ctx context.Context) error
}

type redisCache struct {
	client *redis.Client
}

func NewRedisCache(host, port, password string, db int) (RedisCache, error) {
	client := redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%s", host, port),
		Password: password,
		DB:       db,
	})

	// Verificar conexión
	ctx := context.Background()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis: %w", err)
	}

	return &redisCache{
		client: client,
	}, nil
}

func (r *redisCache) Get(ctx context.Context, key string) (*domain.ExchangeRate, error) {
	val, err := r.client.Get(ctx, key).Result()
	if err == redis.Nil {
		return nil, nil // Key no existe
	}
	if err != nil {
		return nil, fmt.Errorf("error getting from Redis: %w", err)
	}

	var rate domain.ExchangeRate
	if err := json.Unmarshal([]byte(val), &rate); err != nil {
		return nil, fmt.Errorf("error unmarshaling cached data: %w", err)
	}

	// Marcar que viene de caché
	rate.Source = "cache"

	return &rate, nil
}

func (r *redisCache) Set(ctx context.Context, key string, rate *domain.ExchangeRate, ttl time.Duration) error {
	data, err := json.Marshal(rate)
	if err != nil {
		return fmt.Errorf("error marshaling rate: %w", err)
	}

	if err := r.client.Set(ctx, key, data, ttl).Err(); err != nil {
		return fmt.Errorf("error setting in Redis: %w", err)
	}

	return nil
}

func (r *redisCache) Ping(ctx context.Context) error {
	return r.client.Ping(ctx).Err()
}

// Helper para generar claves consistentes
func GenerateCacheKey(from, to string) string {
	return fmt.Sprintf("exchange_rate:%s:%s", from, to)
}
