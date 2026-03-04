package domain

import "database/sql"

type CancelledOrRejectedOrder struct {
	Id            int32
	Estado        string
	ClienteNombre string
	CostoTotal    float64
	Motivo        sql.NullString
}
