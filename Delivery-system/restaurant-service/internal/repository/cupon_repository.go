package repository

import (
	"context"
	"database/sql"
	"fmt"
	"restaurant-service/internal/domain"
	"strings"
)

type CuponRepository struct {
	db *sql.DB
}

func NewCuponRepository(db *sql.DB) *CuponRepository {
	return &CuponRepository{db: db}
}

// ─── Create ──────────────────────────────────────────────────────────────────

func (r *CuponRepository) Create(ctx context.Context, c *domain.Cupon) (int, error) {
	query := `
	INSERT INTO Cupon
		(RestauranteId, Codigo, Titulo, Descripcion, Valor, UsoMaximo, FechaInicio, FechaExpiracion)
	OUTPUT INSERTED.Id
	VALUES (@p1, @p2, @p3, @p4, @p5, @p6, @p7, @p8)
	`

	var id int
	err := r.db.QueryRowContext(ctx, query,
		c.RestauranteId,
		c.Codigo,
		c.Titulo,
		c.Descripcion,
		c.Valor,
		c.UsoMaximo,
		c.FechaInicio,
		c.FechaExpiracion,
	).Scan(&id)

	return id, err
}

// ─── Get (con filtros dinámicos) ─────────────────────────────────────────────
// Aprovecha los índices:
//   IX_Cupon_Restaurante_Fechas  (RestauranteId, FechaInicio, FechaExpiracion, Activo)
//   IX_Cupon_Codigo_Restaurante  (RestauranteId, Codigo)
//   IX_Cupon_Autorizado_Activo   (Autorizado, Activo, FechaInicio)

func (r *CuponRepository) GetWithFilters(
	ctx context.Context,
	f domain.CuponFiltros,
) ([]domain.Cupon, error) {

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

	if f.SoloActivos {
		conditions = append(conditions, "Activo = 1")
	}

	if f.SoloAutorizados {
		conditions = append(conditions, "Autorizado = 1")
	}

	if f.Codigo != "" {
		conditions = append(conditions, fmt.Sprintf("Codigo = %s", placeholder()))
		args = append(args, f.Codigo)
	}

	// Fecha desde: cupones cuya expiración es >= fecha_desde (aún vigentes desde esa fecha)
	if !f.FechaDesde.IsZero() {
		conditions = append(conditions, fmt.Sprintf("FechaExpiracion >= %s", placeholder()))
		args = append(args, f.FechaDesde)
	}

	// Fecha hasta: cupones que iniciaron antes de fecha_hasta
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
		Id, RestauranteId, Codigo, Titulo,
		ISNULL(Descripcion,''),
		Valor, UsoMaximo, UsosActuales,
		FechaInicio, FechaExpiracion,
		Autorizado, Activo
	FROM Cupon
	%s
	ORDER BY FechaInicio DESC
	`, where)

	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.Cupon
	for rows.Next() {
		var c domain.Cupon
		if err := rows.Scan(
			&c.Id,
			&c.RestauranteId,
			&c.Codigo,
			&c.Titulo,
			&c.Descripcion,
			&c.Valor,
			&c.UsoMaximo,
			&c.UsosActuales,
			&c.FechaInicio,
			&c.FechaExpiracion,
			&c.Autorizado,
			&c.Activo,
		); err != nil {
			return nil, err
		}
		result = append(result, c)
	}

	return result, rows.Err()
}

// ─── UpdateCupon — lo hace el restaurante (sin tocar Autorizado) ─────────────

type CuponUpdate struct {
	Titulo          string
	Descripcion     string
	Valor           float64
	UsoMaximo       int
	FechaInicio     interface{} // time.Time o nil
	FechaExpiracion interface{} // time.Time o nil
	Activo          bool
}

func (r *CuponRepository) Update(ctx context.Context, id int, u CuponUpdate) error {
	query := `
	UPDATE Cupon SET
		Titulo          = @p1,
		Descripcion     = @p2,
		Valor           = @p3,
		UsoMaximo       = @p4,
		FechaInicio     = @p5,
		FechaExpiracion = @p6,
		Activo          = @p7
	WHERE Id = @p8
	`

	res, err := r.db.ExecContext(ctx, query,
		u.Titulo,
		u.Descripcion,
		u.Valor,
		u.UsoMaximo,
		u.FechaInicio,
		u.FechaExpiracion,
		u.Activo,
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
		return fmt.Errorf("cupon %d not found", id)
	}

	return nil
}

// ─── AutorizarCupon — exclusivo del administrador ────────────────────────────

func (r *CuponRepository) Autorizar(ctx context.Context, id int, autorizado bool) error {
	query := `
	UPDATE Cupon SET
		Autorizado = @p1
	WHERE Id = @p2
	`

	res, err := r.db.ExecContext(ctx, query, autorizado, id)
	if err != nil {
		return err
	}

	rows, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("cupon %d not found", id)
	}

	return nil
}
