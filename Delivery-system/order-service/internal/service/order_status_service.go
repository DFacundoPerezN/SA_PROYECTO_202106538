package service

import (
	"context"
	"fmt"
	"slices"
	"time"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

var validTransitions = map[string][]string{
	"CREADA":         {"ACEPTADA", "RECHAZADA", "CANCELADA"},
	"ACEPTADA":       {"EN_PREPARACION", "CANCELADA"},
	"EN_PREPARACION": {"TERMINADA", "CANCELADA"},
	"TERMINADA":      {"EN_CAMINO", "CANCELADA"},
	"EN_CAMINO":      {"ENTREGADA", "CANCELADA"},
}

func (s *OrderService) UpdateOrderStatus(ctx context.Context, orderID int, newStatus string) (string, error) {

	currentStatus, err := s.repo.GetOrderStatus(ctx, orderID)
	if err != nil {
		return "", err
	}

	allowed, exists := validTransitions[currentStatus]
	if !exists {
		return "", fmt.Errorf("order cannot be modified from status %s", currentStatus)
	}

	valid := slices.Contains(allowed, newStatus)

	if !valid {
		return "", fmt.Errorf("invalid transition from %s to %s", currentStatus, newStatus)
	}

	err = s.repo.UpdateOrderStatus(ctx, orderID, newStatus)
	if err != nil {
		return "", err
	}

	return newStatus, nil
}

func (s *OrderService) CancelOrder(
	ctx context.Context,
	orderID int,
	userID int,
	reason string,
) (time.Time, error) {

	tx, err := s.repo.DB().BeginTx(ctx, nil)
	if err != nil {
		return time.Time{}, status.Error(codes.Internal, "cannot start transaction")
	}
	defer tx.Rollback()

	// 1. Obtener orden
	order, err := s.repo.GetOrderForUpdate(ctx, tx, orderID)
	if err != nil {
		return time.Time{}, status.Error(codes.NotFound, "order not found")
	}

	// 3. Validar estado
	if order.Estado == "ENTREGADA" {
		return time.Time{}, status.Error(codes.FailedPrecondition, "delivered orders cannot be cancelled")
	}

	if order.Estado == "RECHAZADA" {
		return time.Time{}, status.Error(codes.AlreadyExists, "order already rejected")
	}

	if order.Estado == "CANCELADA" {
		return time.Time{}, status.Error(codes.AlreadyExists, "order already cancelled")
	}

	// 4. Cambiar estado
	err = s.repo.UpdateOrderStatusTx(ctx, tx, orderID, "CANCELADA")
	if err != nil {
		return time.Time{}, status.Error(codes.Internal, "failed to update order")
	}

	// 5. Guardar cancelación
	cancelledAt, err := s.repo.InsertOrderCancellation(ctx, tx, orderID, userID, reason)
	if err != nil {
		return time.Time{}, status.Error(codes.Internal, "failed to save cancellation")
	}

	if err := tx.Commit(); err != nil {
		return time.Time{}, status.Error(codes.Internal, "transaction commit failed")
	}

	return cancelledAt, nil
}
