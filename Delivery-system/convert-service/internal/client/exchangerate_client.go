package client

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"convert-service/internal/domain"
)

type ExchangeRateClient interface {
	GetExchangeRate(ctx context.Context, from, to string) (*domain.ExchangeRate, error)
}

type exchangeRateClient struct {
	apiURL     string
	apiKey     string
	httpClient *http.Client
}

func NewExchangeRateClient(apiURL, apiKey string) ExchangeRateClient {
	return &exchangeRateClient{
		apiURL: apiURL,
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

func (c *exchangeRateClient) GetExchangeRate(ctx context.Context, from, to string) (*domain.ExchangeRate, error) {
	from = strings.ToUpper(strings.TrimSpace(from))
	to = strings.ToUpper(strings.TrimSpace(to))

	if from == "" || to == "" {
		return nil, fmt.Errorf("from and to currencies are required")
	}

	if strings.TrimSpace(c.apiURL) == "" {
		return nil, fmt.Errorf("exchange API URL is not configured")
	}

	if strings.TrimSpace(c.apiKey) == "" {
		return nil, fmt.Errorf("exchange API key is not configured")
	}

	// Construir URL de la API
	// Ejemplo: https://v6.exchangerate-api.com/v6/YOUR-API-KEY/latest/USD
	url := fmt.Sprintf("%s/%s/latest/%s", c.apiURL, c.apiKey, from)

	// Crear request
	req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
	if err != nil {
		return nil, fmt.Errorf("error creating request: %w", err)
	}

	// Ejecutar request
	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("error calling exchange rate API: %w", err)
	}
	defer resp.Body.Close()

	// Verificar status code
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	// Parse response
	var apiResponse domain.ExchangeAPIResponse
	if err := json.NewDecoder(resp.Body).Decode(&apiResponse); err != nil {
		return nil, fmt.Errorf("error decoding API response: %w", err)
	}

	// Verificar resultado
	if apiResponse.Result != "success" {
		return nil, fmt.Errorf("API returned result: %s", apiResponse.Result)
	}

	// Obtener tasa de cambio específica
	rate, exists := apiResponse.ConversionRates[to]
	if !exists {
		return nil, fmt.Errorf("currency %s not found in conversion rates", to)
	}

	return &domain.ExchangeRate{
		FromCurrency: from,
		ToCurrency:   to,
		Rate:         rate,
		Timestamp:    time.Now(),
		Source:       "api",
	}, nil
}
