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

// ─── Promociones ─────────────────────────────────────────────────────────────

func (c *RestaurantClient) CreatePromocion(ctx context.Context, req *restaurantpb.CreatePromocionRequest) (*restaurantpb.CreatePromocionResponse, error) {
	return c.client.CreatePromocion(ctx, req)
}

func (c *RestaurantClient) GetPromociones(ctx context.Context, req *restaurantpb.GetPromocionesRequest) (*restaurantpb.GetPromocionesResponse, error) {
	return c.client.GetPromociones(ctx, req)
}

func (c *RestaurantClient) UpdatePromocion(ctx context.Context, req *restaurantpb.UpdatePromocionRequest) (*restaurantpb.UpdatePromocionResponse, error) {
	return c.client.UpdatePromocion(ctx, req)
}

// ─── Cupones ──────────────────────────────────────────────────────────────────

func (c *RestaurantClient) CreateCupon(ctx context.Context, req *restaurantpb.CreateCuponRequest) (*restaurantpb.CreateCuponResponse, error) {
	return c.client.CreateCupon(ctx, req)
}

func (c *RestaurantClient) GetCupones(ctx context.Context, req *restaurantpb.GetCuponesRequest) (*restaurantpb.GetCuponesResponse, error) {
	return c.client.GetCupones(ctx, req)
}

func (c *RestaurantClient) UpdateCupon(ctx context.Context, req *restaurantpb.UpdateCuponRequest) (*restaurantpb.UpdateCuponResponse, error) {
	return c.client.UpdateCupon(ctx, req)
}

func (c *RestaurantClient) AutorizarCupon(ctx context.Context, req *restaurantpb.AutorizarCuponRequest) (*restaurantpb.AutorizarCuponResponse, error) {
	return c.client.AutorizarCupon(ctx, req)
}

func (c *RestaurantClient) IncrementarUsoCupon(ctx context.Context, req *restaurantpb.IncrementarUsoCuponRequest) (*restaurantpb.IncrementarUsoCuponResponse, error) {
	return c.client.IncrementarUsoCupon(ctx, req)
}

func (c *RestaurantClient) VerificarExpiracionCupon(ctx context.Context, req *restaurantpb.VerificarExpiracionCuponRequest) (*restaurantpb.VerificarExpiracionCuponResponse, error) {
	return c.client.VerificarExpiracionCupon(ctx, req)
}
