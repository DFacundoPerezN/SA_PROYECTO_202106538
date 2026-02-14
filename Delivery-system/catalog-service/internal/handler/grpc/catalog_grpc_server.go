package grpc

import (
	"catalog-service/internal/service"
	"context"

	catalogpb "delivery-proto/catalogpb"
)

type CatalogGRPCServer struct {
	catalogpb.UnimplementedCatalogServiceServer
	service *service.ProductService
}

func NewCatalogGRPCServer(s *service.ProductService) *CatalogGRPCServer {
	return &CatalogGRPCServer{service: s}
}

func (s *CatalogGRPCServer) GetProductsByRestaurant(
	ctx context.Context,
	req *catalogpb.GetProductsByRestaurantRequest,
) (*catalogpb.GetProductsByRestaurantResponse, error) {

	products, err := s.service.GetCatalog(int(req.RestauranteId))
	if err != nil {
		return nil, err
	}

	var protoProducts []*catalogpb.Product

	for _, p := range products {
		protoProducts = append(protoProducts, &catalogpb.Product{
			Id:           int32(p.ID),
			RestaurantId: int32(p.RestauranteID),
			Nombre:       p.Nombre,
			Descripcion:  p.Descripcion,
			Precio:       p.Precio,
			Disponible:   p.Disponible,
			Categoria:    p.Categoria,
		})
	}

	return &catalogpb.GetProductsByRestaurantResponse{
		Products: protoProducts,
	}, nil
}

func (s *CatalogGRPCServer) GetProductsByIDs(
	ctx context.Context,
	req *catalogpb.GetProductsByIDsRequest,
) (*catalogpb.GetProductsByIDsResponse, error) {

	products, err := s.service.GetProductsByIDs(req.Ids)
	if err != nil {
		return nil, err
	}

	var protoProducts []*catalogpb.Product

	for _, p := range products {
		protoProducts = append(protoProducts, &catalogpb.Product{
			Id:           int32(p.ID),
			Nombre:       p.Nombre,
			Descripcion:  p.Descripcion,
			Precio:       p.Precio,
			Disponible:   p.Disponible,
			RestaurantId: int32(p.RestauranteID),
			Categoria:    p.Categoria,
		})
	}

	return &catalogpb.GetProductsByIDsResponse{
		Products: protoProducts,
	}, nil
}
