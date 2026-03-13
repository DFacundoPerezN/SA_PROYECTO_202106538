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

type PromocionService struct {
	repo *repository.PromocionRepository
}

func NewPromocionService(r *repository.PromocionRepository) *PromocionService {
	return &PromocionService{repo: r}
}

// ─── Create ──────────────────────────────────────────────────────────────────

func (s *PromocionService) CreatePromocion(
	ctx context.Context,
	req *restaurantpb.CreatePromocionRequest,
) (int, error) {

	if req.Titulo == "" {
		return 0, status.Error(codes.InvalidArgument, "titulo es requerido")
	}
	if req.Tipo != "PORCENTAJE" && req.Tipo != "ENVIO_GRATIS" {
		return 0, status.Error(codes.InvalidArgument, "tipo debe ser PORCENTAJE o ENVIO_GRATIS")
	}
	if req.Valor < 0 {
		return 0, status.Error(codes.InvalidArgument, "valor no puede ser negativo")
	}

	inicio, err := parseDate(req.FechaInicio)
	if err != nil {
		return 0, status.Error(codes.InvalidArgument, "fecha_inicio inválida (use ISO 8601)")
	}
	fin, err := parseDate(req.FechaFin)
	if err != nil {
		return 0, status.Error(codes.InvalidArgument, "fecha_fin inválida (use ISO 8601)")
	}
	if fin.Before(inicio) {
		return 0, status.Error(codes.InvalidArgument, "fecha_fin debe ser >= fecha_inicio")
	}

	p := &domain.Promocion{
		RestauranteId: int(req.RestauranteId),
		Titulo:        req.Titulo,
		Descripcion:   req.Descripcion,
		Tipo:          req.Tipo,
		Valor:         req.Valor,
		FechaInicio:   inicio,
		FechaFin:      fin,
	}

	id, err := s.repo.Create(ctx, p)
	if err != nil {
		return 0, status.Error(codes.Internal, "error al crear promoción: "+err.Error())
	}
	return id, nil
}

// ─── Get con filtros ─────────────────────────────────────────────────────────

func (s *PromocionService) GetPromociones(
	ctx context.Context,
	req *restaurantpb.GetPromocionesRequest,
) ([]domain.Promocion, error) {

	filtros := domain.PromocionFiltros{
		RestauranteId: int(req.RestauranteId),
		SoloActivas:   req.SoloActivas,
		Tipo:          req.Tipo,
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

	promociones, err := s.repo.GetWithFilters(ctx, filtros)
	if err != nil {
		return nil, status.Error(codes.Internal, "error al obtener promociones: "+err.Error())
	}
	return promociones, nil
}

// ─── Update ──────────────────────────────────────────────────────────────────

func (s *PromocionService) UpdatePromocion(
	ctx context.Context,
	req *restaurantpb.UpdatePromocionRequest,
) error {

	if req.Id <= 0 {
		return status.Error(codes.InvalidArgument, "id inválido")
	}
	if req.Titulo == "" {
		return status.Error(codes.InvalidArgument, "titulo es requerido")
	}
	if req.Tipo != "PORCENTAJE" && req.Tipo != "ENVIO_GRATIS" {
		return status.Error(codes.InvalidArgument, "tipo debe ser PORCENTAJE o ENVIO_GRATIS")
	}
	if req.Valor < 0 {
		return status.Error(codes.InvalidArgument, "valor no puede ser negativo")
	}

	inicio, err := parseDate(req.FechaInicio)
	if err != nil {
		return status.Error(codes.InvalidArgument, "fecha_inicio inválida")
	}
	fin, err := parseDate(req.FechaFin)
	if err != nil {
		return status.Error(codes.InvalidArgument, "fecha_fin inválida")
	}
	if fin.Before(inicio) {
		return status.Error(codes.InvalidArgument, "fecha_fin debe ser >= fecha_inicio")
	}

	upd := repository.PromocionUpdate{
		Titulo:      req.Titulo,
		Descripcion: req.Descripcion,
		Tipo:        req.Tipo,
		Valor:       req.Valor,
		FechaInicio: inicio,
		FechaFin:    fin,
		Activa:      req.Activa,
	}

	if err := s.repo.Update(ctx, int(req.Id), upd); err != nil {
		return status.Error(codes.Internal, "error al actualizar promoción: "+err.Error())
	}
	return nil
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// parseDate acepta ISO 8601 con o sin hora.
func parseDate(s string) (time.Time, error) {
	layouts := []string{
		time.RFC3339,
		"2006-01-02T15:04:05",
		"2006-01-02",
	}
	for _, l := range layouts {
		if t, err := time.Parse(l, s); err == nil {
			return t, nil
		}
	}
	return time.Time{}, status.Error(codes.InvalidArgument, "formato de fecha inválido")
}
