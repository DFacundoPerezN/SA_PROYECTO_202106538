package service

import (
	"context"
	"fmt"
	"log"
	"strings"
	"time"

	"convert-service/internal/cache"
	"convert-service/internal/client"
	"convert-service/internal/domain"
)

type ConvertService interface {
	GetExchangeRate(ctx context.Context, from, to string) (*domain.ExchangeRate, error)
	ConvertCurrency(ctx context.Context, from, to string, amount float64) (float64, *domain.ExchangeRate, error)
}

type convertService struct {
	apiClient client.ExchangeRateClient
	cache     cache.RedisCache
	cacheTTL  time.Duration
}

func NewConvertService(apiClient client.ExchangeRateClient, redisCache cache.RedisCache, cacheTTLSeconds int) ConvertService {
	return &convertService{
		apiClient: apiClient,
		cache:     redisCache,
		cacheTTL:  time.Duration(cacheTTLSeconds) * time.Second,
	}
}

func (s *convertService) GetExchangeRate(ctx context.Context, from, to string) (*domain.ExchangeRate, error) {
	from = strings.ToUpper(strings.TrimSpace(from))
	to = strings.ToUpper(strings.TrimSpace(to))

	if from == "" || to == "" {
		return nil, fmt.Errorf("from and to currencies are required")
	}

	// 1. Intentar obtener de caché
	cacheKey := cache.GenerateCacheKey(from, to)
	cachedRate, err := s.cache.Get(ctx, cacheKey)
	
	if err != nil {
		log.Printf("Warning: error reading from cache: %v", err)
	}

	// Si se encuentra en caché y no ha expirado, retornar
	if cachedRate != nil {
		log.Printf("Cache hit for %s->%s", from, to)
		return cachedRate, nil
	}

	log.Printf("Cache miss for %s->%s, fetching from API", from, to)

	// 2. Si no está en caché, consultar a la API
	rate, err := s.apiClient.GetExchangeRate(ctx, from, to)
	
	if err != nil {
		log.Printf("Error fetching from API: %v", err)
		
		// 3. Si la API falla, intentar usar caché antiguo como fallback
		// (ignorando TTL)
		if cachedRate != nil {
			log.Printf("API failed, using stale cache as fallback for %s->%s", from, to)
			cachedRate.Source = "cache_fallback"
			return cachedRate, nil
		}
		
		return nil, fmt.Errorf("API failed and no cache available: %w", err)
	}

	// 4. Guardar en caché el nuevo valor
	if err := s.cache.Set(ctx, cacheKey, rate, s.cacheTTL); err != nil {
		log.Printf("Warning: failed to cache exchange rate: %v", err)
		// No retornar error, solo loggearlo
	}

	return rate, nil
}

func (s *convertService) ConvertCurrency(ctx context.Context, from, to string, amount float64) (float64, *domain.ExchangeRate, error) {
	if amount <= 0 {
		return 0, nil, fmt.Errorf("amount must be greater than 0")
	}

	rate, err := s.GetExchangeRate(ctx, from, to)
	if err != nil {
		return 0, nil, err
	}

	convertedAmount := amount * rate.Rate

	return convertedAmount, rate, nil
}
