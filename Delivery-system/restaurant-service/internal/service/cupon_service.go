package service

import (
	"context"
	"restaurant-service/internal/domain"
	"restaurant-service/internal/repository"
	"time"

	"delivery-proto/restaurantpb"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type CuponService struct {
	repo *repository.CuponRepository
}

func NewCuponService(r *repository.CuponRepository) *CuponService {
	return &CuponService{repo: r}
}

// ─── Create ──────────────────────────────────────────────────────────────────

func (s *CuponService) CreateCupon(
	ctx context.Context,
	req *restaurantpb.CreateCuponRequest,
) (int, error) {

	if req.RestauranteId <= 0 {
		return 0, status.Error(codes.InvalidArgument, "restaurante_id es requerido")
	}
	if req.Codigo == "" {
		return 0, status.Error(codes.InvalidArgument, "codigo es requerido")
	}
	if req.Titulo == "" {
		return 0, status.Error(codes.InvalidArgument, "titulo es requerido")
	}
	if req.Valor < 0 {
		return 0, status.Error(codes.InvalidArgument, "valor no puede ser negativo")
	}
	if req.UsoMaximo <= 0 {
		return 0, status.Error(codes.InvalidArgument, "uso_maximo debe ser mayor a 0")
	}

	// FechaInicio es opcional — default NOW
	var inicio time.Time
	if req.FechaInicio != "" {
		t, err := parseDate(req.FechaInicio)
		if err != nil {
			return 0, status.Error(codes.InvalidArgument, "fecha_inicio inválida (use ISO 8601)")
		}
		inicio = t
	} else {
		inicio = time.Now()
	}

	expiracion, err := parseDate(req.FechaExpiracion)
	if err != nil {
		return 0, status.Error(codes.InvalidArgument, "fecha_expiracion inválida (use ISO 8601)")
	}
	if expiracion.Before(inicio) {
		return 0, status.Error(codes.InvalidArgument, "fecha_expiracion debe ser >= fecha_inicio")
	}

	c := &domain.Cupon{
		RestauranteId:   int(req.RestauranteId),
		Codigo:          req.Codigo,
		Titulo:          req.Titulo,
		Descripcion:     req.Descripcion,
		Valor:           req.Valor,
		UsoMaximo:       int(req.UsoMaximo),
		FechaInicio:     inicio,
		FechaExpiracion: expiracion,
	}

	id, err := s.repo.Create(ctx, c)
	if err != nil {
		return 0, status.Error(codes.Internal, "error al crear cupón: "+err.Error())
	}
	return id, nil
}

// ─── Get con filtros ─────────────────────────────────────────────────────────

func (s *CuponService) GetCupones(
	ctx context.Context,
	req *restaurantpb.GetCuponesRequest,
) ([]domain.Cupon, error) {

	filtros := domain.CuponFiltros{
		RestauranteId:   int(req.RestauranteId),
		SoloActivos:     req.SoloActivos,
		SoloAutorizados: req.SoloAutorizados,
		Codigo:          req.Codigo,
	}

	if req.FechaDesde != "" {
		t, err := parseDate(req.FechaDesde)
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, "fecha_desde inválida")
		}
		filtros.FechaDesde = t
	}
	if req.FechaHasta != "" {
		t, err := parseDate(req.FechaHasta)
		if err != nil {
			return nil, status.Error(codes.InvalidArgument, "fecha_hasta inválida")
		}
		filtros.FechaHasta = t
	}

	cupones, err := s.repo.GetWithFilters(ctx, filtros)
	if err != nil {
		return nil, status.Error(codes.Internal, "error al obtener cupones: "+err.Error())
	}
	return cupones, nil
}

// ─── UpdateCupon — restaurante (sin Autorizado) ───────────────────────────────

func (s *CuponService) UpdateCupon(
	ctx context.Context,
	req *restaurantpb.UpdateCuponRequest,
) error {

	if req.Id <= 0 {
		return status.Error(codes.InvalidArgument, "id inválido")
	}
	if req.Titulo == "" {
		return status.Error(codes.InvalidArgument, "titulo es requerido")
	}
	if req.Valor < 0 {
		return status.Error(codes.InvalidArgument, "valor no puede ser negativo")
	}
	if req.UsoMaximo <= 0 {
		return status.Error(codes.InvalidArgument, "uso_maximo debe ser mayor a 0")
	}

	var inicio interface{}
	if req.FechaInicio != "" {
		t, err := parseDate(req.FechaInicio)
		if err != nil {
			return status.Error(codes.InvalidArgument, "fecha_inicio inválida")
		}
		inicio = t
	}

	var expiracion interface{}
	if req.FechaExpiracion != "" {
		t, err := parseDate(req.FechaExpiracion)
		if err != nil {
			return status.Error(codes.InvalidArgument, "fecha_expiracion inválida")
		}
		// Validate order only when both are provided
		if inicio != nil {
			if t.Before(inicio.(time.Time)) {
				return status.Error(codes.InvalidArgument, "fecha_expiracion debe ser >= fecha_inicio")
			}
		}
		expiracion = t
	}

	upd := repository.CuponUpdate{
		Titulo:          req.Titulo,
		Descripcion:     req.Descripcion,
		Valor:           req.Valor,
		UsoMaximo:       int(req.UsoMaximo),
		FechaInicio:     inicio,
		FechaExpiracion: expiracion,
		Activo:          req.Activo,
	}

	if err := s.repo.Update(ctx, int(req.Id), upd); err != nil {
		return status.Error(codes.Internal, "error al actualizar cupón: "+err.Error())
	}
	return nil
}

// ─── AutorizarCupon — solo administrador ─────────────────────────────────────

func (s *CuponService) AutorizarCupon(
	ctx context.Context,
	req *restaurantpb.AutorizarCuponRequest,
) error {

	if req.Id <= 0 {
		return status.Error(codes.InvalidArgument, "id inválido")
	}

	if err := s.repo.Autorizar(ctx, int(req.Id), req.Autorizado); err != nil {
		return status.Error(codes.Internal, "error al autorizar cupón: "+err.Error())
	}
	return nil
}
