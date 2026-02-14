package clients

import (
	"context"
	catalogpb "delivery-proto/catalogpb"
	"time"

	"google.golang.org/grpc"
)

type CatalogClient struct {
	client catalogpb.CatalogServiceClient
}

func NewCatalogClient(addr string) (*CatalogClient, error) {
	conn, err := grpc.Dial(addr, grpc.WithInsecure())
	if err != nil {
		return nil, err
	}

	c := catalogpb.NewCatalogServiceClient(conn)

	return &CatalogClient{client: c}, nil
}

func (c *CatalogClient) GetProduct(ctx context.Context, id int32) (*catalogpb.Product, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	resp, err := c.client.GetProduct(ctx, &catalogpb.GetProductRequest{
		ProductId: id,
	})
	if err != nil {
		return nil, err
	}
	producto := &catalogpb.Product{
		Id:         resp.Id,
		Nombre:     resp.Nombre,
		Disponible: resp.Disponible,
		Precio:     resp.Precio,
	}
	return producto, nil
}

func (c *CatalogClient) GetProductsByIDs(ctx context.Context, ids []int32) ([]*catalogpb.Product, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	resp, err := c.client.GetProductsByIDs(ctx, &catalogpb.GetProductsByIDsRequest{
		Ids: ids,
	})
	if err != nil {
		return nil, err
	}

	return resp.Products, nil
}
