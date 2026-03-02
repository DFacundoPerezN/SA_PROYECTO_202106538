package service

func (s *OrderService) AddOrderImage(orderID int32, imageURL string) error {
	return s.repo.AddOrderImage(orderID, imageURL)
}
