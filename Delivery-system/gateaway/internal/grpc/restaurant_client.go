package grpc

import (
	"context"
	"time"

	restaurantpb "delivery-proto/restaurantpb"

	"google.golang.org/grpc"
)

type RestaurantClient struct {
	client restaurantpb.RestaurantServiceClient
}

func NewRestaurantClient(addr string) (*RestaurantClient, error) {
	conn, err := grpc.Dial(addr, grpc.WithInsecure())
	if err != nil {
		return nil, err
	}

	c := restaurantpb.NewRestaurantServiceClient(conn)

	return &RestaurantClient{
		client: c,
	}, nil

}

func (c *RestaurantClient) ListRestaurants() (*restaurantpb.RestaurantListResponse, error) {

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return c.client.ListRestaurants(ctx, &restaurantpb.Empty{})
}

func (c *RestaurantClient) CreateRestaurant(ctx context.Context, req *restaurantpb.CreateRestaurantRequest) (*restaurantpb.CreateRestaurantResponse, error) {
	return c.client.CreateRestaurant(ctx, req)
}

func (c *RestaurantClient) CreateRestaurantRating(ctx context.Context, req *restaurantpb.CreateRestaurantRatingRequest) (*restaurantpb.CreateRestaurantRatingResponse, error) {
	return c.client.CreateRestaurantRating(ctx, req)
}

func (c *RestaurantClient) GetRestaurantRatingAverage(ctx context.Context, req *restaurantpb.GetRestaurantRatingAverageRequest) (*restaurantpb.GetRestaurantRatingAverageResponse, error) {
	return c.client.GetRestaurantRatingAverage(ctx, req)
}

func (c *RestaurantClient) GetLatestRestaurants(ctx context.Context, req *restaurantpb.GetLatestRestaurantsRequest) (*restaurantpb.GetRestaurantsResponse, error) {
	return c.client.GetLatestRestaurants(ctx, req)
}

func (c *RestaurantClient) GetTopRatedRestaurants(ctx context.Context, req *restaurantpb.GetTopRatedRestaurantsRequest) (*restaurantpb.GetRestaurantsResponse, error) {
	return c.client.GetTopRatedRestaurants(ctx, req)
}
