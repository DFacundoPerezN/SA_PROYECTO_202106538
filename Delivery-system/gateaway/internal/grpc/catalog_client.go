package grpc

import (
	"context"
	"time"

	catalogpb "delivery-proto/catalogpb"

	"google.golang.org/grpc"
)

type CatalogClient struct {
	client catalogpb.CatalogServiceClient
}

func NewCatalogClient(address string) (*CatalogClient, error) {

	conn, err := grpc.Dial(address, grpc.WithInsecure())
	if err != nil {
		return nil, err
	}

	return &CatalogClient{
		client: catalogpb.NewCatalogServiceClient(conn),
	}, nil
}

func (c *CatalogClient) GetCatalog(restaurantID int32) (*catalogpb.GetProductsByRestaurantResponse, error) {

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return c.client.GetProductsByRestaurant(ctx, &catalogpb.GetProductsByRestaurantRequest{
		RestauranteId: restaurantID,
	})
}

func (c *CatalogClient) CreateProduct(
	ctx context.Context,
	req *catalogpb.CreateProductRequest,
) (*catalogpb.CreateProductResponse, error) {

	return c.client.CreateProduct(ctx, req)
}
