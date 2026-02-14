package grpcclient

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

	client := catalogpb.NewCatalogServiceClient(conn)

	return &CatalogClient{client: client}, nil
}

func (c *CatalogClient) GetProductsByIDs(ids []int32) ([]*catalogpb.Product, error) {

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	res, err := c.client.GetProductsByIDs(ctx, &catalogpb.GetProductsByIDsRequest{
		Ids: ids,
	})
	if err != nil {
		return nil, err
	}

	return res.Products, nil
}
