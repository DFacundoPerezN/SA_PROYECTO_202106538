package repository

import (
	"context"
	"database/sql"
	"fmt"
	"restaurant-service/internal/domain"
	"strings"
	"time"
)

type PromocionRepository struct {
	db *sql.DB
}

func NewPromocionRepository(db *sql.DB) *PromocionRepository {
	return &PromocionRepository{db: db}
}

// ─── Create ──────────────────────────────────────────────────────────────────

func (r *PromocionRepository) Create(ctx context.Context, p *domain.Promocion) (int, error) {
	query := `
	INSERT INTO Promocion
		(RestauranteId, Titulo, Descripcion, Tipo, Valor, FechaInicio, FechaFin, Activa)
	OUTPUT INSERTED.Id
	VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7, 1)
	`

	var id int
	err := r.db.QueryRowContext(ctx, query,
		p.RestauranteId,
		p.Titulo,
		p.Descripcion,
		p.Tipo,
		p.Valor,
		p.FechaInicio,
		p.FechaFin,
	).Scan(&id)

	return id, err
}

// ─── Get (con filtros dinámicos) ─────────────────────────────────────────────

func (r *PromocionRepository) GetWithFilters(
	ctx context.Context,
	f domain.PromocionFiltros,
) ([]domain.Promocion, error) {

	// Construcción dinámica de WHERE — aprovecha los índices existentes
	var (
		conditions []string
		args       []interface{}
		argIdx     = 1
	)

	placeholder := func() string {
		s := fmt.Sprintf("@p%d", argIdx)
		argIdx++
		return s
	}

	if f.RestauranteId > 0 {
		conditions = append(conditions, fmt.Sprintf("RestauranteId = %s", placeholder()))
		args = append(args, f.RestauranteId)
	}

	if f.SoloActivas {
		conditions = append(conditions, "Activa = 1")
	}

	if f.Tipo != "" {
		conditions = append(conditions, fmt.Sprintf("Tipo = %s", placeholder()))
		args = append(args, f.Tipo)
	}

	if !f.FechaDesde.IsZero() {
		conditions = append(conditions, fmt.Sprintf("FechaFin >= %s", placeholder()))
		args = append(args, f.FechaDesde)
	}

	if !f.FechaHasta.IsZero() {
		conditions = append(conditions, fmt.Sprintf("FechaInicio <= %s", placeholder()))
		args = append(args, f.FechaHasta)
	}

	where := ""
	if len(conditions) > 0 {
		where = "WHERE " + strings.Join(conditions, " AND ")
	}

	query := fmt.Sprintf(`
	SELECT
		Id, RestauranteId, Titulo,
		ISNULL(Descripcion,''),
		Tipo, Valor,
		FechaInicio, FechaFin, Activa
	FROM Promocion
	%s
	ORDER BY FechaInicio DESC
	`, where)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.Promocion
	for rows.Next() {
		var p domain.Promocion
		err := rows.Scan(
			&p.Id,
			&p.RestauranteId,
			&p.Titulo,
			&p.Descripcion,
			&p.Tipo,
			&p.Valor,
			&p.FechaInicio,
			&p.FechaFin,
			&p.Activa,
		)
		if err != nil {
			return nil, err
		}
		result = append(result, p)
	}

	return result, rows.Err()
}

// ─── Update ──────────────────────────────────────────────────────────────────

type PromocionUpdate struct {
	Titulo      string
	Descripcion string
	Tipo        string
	Valor       float64
	FechaInicio time.Time
	FechaFin    time.Time
	Activa      bool
}

func (r *PromocionRepository) Update(ctx context.Context, id int, u PromocionUpdate) error {
	query := `
	UPDATE Promocion SET
		Titulo      = @p1,
		Descripcion = @p2,
		Tipo        = @p3,
		Valor       = @p4,
		FechaInicio = @p5,
		FechaFin    = @p6,
		Activa      = @p7
	WHERE Id = @p8
	`

	res, err := r.db.ExecContext(ctx, query,
		u.Titulo,
		u.Descripcion,
		u.Tipo,
		u.Valor,
		u.FechaInicio,
		u.FechaFin,
		u.Activa,
		id,
	)
	if err != nil {
		return err
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("promocion %d not found", id)
	}

	return nil
}
