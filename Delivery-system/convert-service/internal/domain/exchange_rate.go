package domain

import "time"

// ExchangeRate representa un tipo de cambio entre dos monedas
type ExchangeRate struct {
	FromCurrency string    `json:"from_currency"`
	ToCurrency   string    `json:"to_currency"`
	Rate         float64   `json:"rate"`
	Timestamp    time.Time `json:"timestamp"`
	Source       string    `json:"source"` // "api" o "cache"
}

// ExchangeAPIResponse representa la respuesta de ExchangeRate-API
type ExchangeAPIResponse struct {
	Result            string             `json:"result"`
	Documentation     string             `json:"documentation"`
	TermsOfUse        string             `json:"terms_of_use"`
	TimeLastUpdateUTC string             `json:"time_last_update_utc"`
	TimeNextUpdateUTC string             `json:"time_next_update_utc"`
	BaseCode          string             `json:"base_code"`
	ConversionRates   map[string]float64 `json:"conversion_rates"`
}
