package handlers

import (
	"net/http"
	"strconv"

	grpcclient "api-gateway/internal/grpc"
	"delivery-proto/restaurantpb"

	"github.com/gin-gonic/gin"
)

type RestaurantHandler struct {
	restaurantClient *grpcclient.RestaurantClient
}

func NewRestaurantHandler(c *grpcclient.RestaurantClient) *RestaurantHandler {
	return &RestaurantHandler{restaurantClient: c}
}

func (h *RestaurantHandler) ListRestaurants(ctx *gin.Context) {

	resp, err := h.restaurantClient.ListRestaurants()
	if err != nil {
		ctx.JSON(http.StatusInternalServerError, gin.H{
			"error": "could not fetch restaurants",
		})
		return
	}

	var restaurants []gin.H

	for _, r := range resp.Restaurants {
		restaurants = append(restaurants, gin.H{
			"id":           r.Id,
			"nombre":       r.Nombre,
			"direccion":    r.Direccion,
			"latitud":      r.Latitud,
			"longitud":     r.Longitud,
			"telefono":     r.Telefono,
			"calificacion": r.Calificacion,
			"activo":       r.Activo,
		})
	}

	ctx.JSON(http.StatusOK, gin.H{
		"restaurants": restaurants,
	})

}

func (h *RestaurantHandler) CreateRestaurant(c *gin.Context) {

	var body struct {
		Nombre          string  `json:"nombre"`
		Direccion       string  `json:"direccion"`
		Latitud         float64 `json:"latitud"`
		Longitud        float64 `json:"longitud"`
		Telefono        string  `json:"telefono"`
		HorarioApertura string  `json:"horario_apertura"`
		HorarioCierre   string  `json:"horario_cierre"`
		UserID          int32   `json:"user_id"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	//userID := c.GetInt("user_id")

	resp, err := h.restaurantClient.CreateRestaurant(c, &restaurantpb.CreateRestaurantRequest{
		UserId:          body.UserID,
		Nombre:          body.Nombre,
		Direccion:       body.Direccion,
		Latitud:         body.Latitud,
		Longitud:        body.Longitud,
		Telefono:        body.Telefono,
		HorarioApertura: body.HorarioApertura,
		HorarioCierre:   body.HorarioCierre,
	})

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(201, resp)
}

func (h *RestaurantHandler) CreateRating(c *gin.Context) {

	clientID := c.GetInt("user_id")

	var req struct {
		RestaurantID int32  `json:"restaurant_id"`
		Stars        int32  `json:"stars"`
		Comment      string `json:"comment"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "body inválido"})
		return
	}

	resp, err := h.restaurantClient.CreateRestaurantRating(c, &restaurantpb.CreateRestaurantRatingRequest{
		ClienteId:     int32(clientID),
		RestauranteId: req.RestaurantID,
		Estrellas:     req.Stars,
		Comentario:    req.Comment,
	})

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp)
}

func (h *RestaurantHandler) GetRatingAverage(c *gin.Context) {

	restaurantID, _ := strconv.Atoi(c.Param("id"))

	resp, err := h.restaurantClient.GetRestaurantRatingAverage(c, &restaurantpb.GetRestaurantRatingAverageRequest{
		RestauranteId: int32(restaurantID),
	})

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp)
}

func (h *RestaurantHandler) GetLatestRestaurants(c *gin.Context) {

	limitStr := c.DefaultQuery("n", "8")
	limit, _ := strconv.Atoi(limitStr)

	resp, err := h.restaurantClient.GetLatestRestaurants(
		c,
		&restaurantpb.GetLatestRestaurantsRequest{
			Limit: int32(limit),
		},
	)

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp.Restaurants)
}

func (h *RestaurantHandler) GetTopRatedRestaurants(c *gin.Context) {

	limitStr := c.DefaultQuery("n", "8")
	limit, _ := strconv.Atoi(limitStr)

	resp, err := h.restaurantClient.GetTopRatedRestaurants(
		c,
		&restaurantpb.GetTopRatedRestaurantsRequest{
			Limit: int32(limit),
		},
	)

	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp.Restaurants)
}

// ─── Promociones ─────────────────────────────────────────────────────────────

// POST /api/restaurants/:id/promociones
func (h *RestaurantHandler) CreatePromocion(c *gin.Context) {
	restaurantID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "id inválido"})
		return
	}

	var body struct {
		Titulo      string  `json:"titulo"`
		Descripcion string  `json:"descripcion"`
		Tipo        string  `json:"tipo"`
		Valor       float64 `json:"valor"`
		FechaInicio string  `json:"fecha_inicio"`
		FechaFin    string  `json:"fecha_fin"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.restaurantClient.CreatePromocion(c, &restaurantpb.CreatePromocionRequest{
		RestauranteId: int32(restaurantID),
		Titulo:        body.Titulo,
		Descripcion:   body.Descripcion,
		Tipo:          body.Tipo,
		Valor:         body.Valor,
		FechaInicio:   body.FechaInicio,
		FechaFin:      body.FechaFin,
	})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(201, resp)
}

// GET /api/promociones
// Query params:
//   - restaurante_id  int    (0 = todos)
//   - solo_activas    bool
//   - tipo            string ("PORCENTAJE" | "ENVIO_GRATIS")
//   - fecha_desde     string (ISO 8601)
//   - fecha_hasta     string (ISO 8601)
func (h *RestaurantHandler) GetPromociones(c *gin.Context) {
	restauranteID, _ := strconv.Atoi(c.DefaultQuery("restaurante_id", "0"))
	soloActivas := c.DefaultQuery("solo_activas", "false") == "true"

	resp, err := h.restaurantClient.GetPromociones(c, &restaurantpb.GetPromocionesRequest{
		RestauranteId: int32(restauranteID),
		SoloActivas:   soloActivas,
		Tipo:          c.DefaultQuery("tipo", ""),
		FechaDesde:    c.DefaultQuery("fecha_desde", ""),
		FechaHasta:    c.DefaultQuery("fecha_hasta", ""),
	})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	if resp.Promociones == nil {
		c.JSON(200, gin.H{"promociones": []interface{}{}})
		return
	}

	c.JSON(200, gin.H{"promociones": resp.Promociones})
}

// PUT /api/promociones/:id
func (h *RestaurantHandler) UpdatePromocion(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "id inválido"})
		return
	}

	var body struct {
		Titulo      string  `json:"titulo"`
		Descripcion string  `json:"descripcion"`
		Tipo        string  `json:"tipo"`
		Valor       float64 `json:"valor"`
		FechaInicio string  `json:"fecha_inicio"`
		FechaFin    string  `json:"fecha_fin"`
		Activa      bool    `json:"activa"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.restaurantClient.UpdatePromocion(c, &restaurantpb.UpdatePromocionRequest{
		Id:          int32(id),
		Titulo:      body.Titulo,
		Descripcion: body.Descripcion,
		Tipo:        body.Tipo,
		Valor:       body.Valor,
		FechaInicio: body.FechaInicio,
		FechaFin:    body.FechaFin,
		Activa:      body.Activa,
	})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp)
}

// ─── Cupones ──────────────────────────────────────────────────────────────────

// POST /api/restaurants/:id/cupones
// Acceso: restaurante autenticado
func (h *RestaurantHandler) CreateCupon(c *gin.Context) {
	restaurantID, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "id inválido"})
		return
	}

	var body struct {
		Codigo          string  `json:"codigo"`
		Titulo          string  `json:"titulo"`
		Descripcion     string  `json:"descripcion"`
		Valor           float64 `json:"valor"`
		UsoMaximo       int32   `json:"uso_maximo"`
		FechaInicio     string  `json:"fecha_inicio"`
		FechaExpiracion string  `json:"fecha_expiracion"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.restaurantClient.CreateCupon(c, &restaurantpb.CreateCuponRequest{
		RestauranteId:   int32(restaurantID),
		Codigo:          body.Codigo,
		Titulo:          body.Titulo,
		Descripcion:     body.Descripcion,
		Valor:           body.Valor,
		UsoMaximo:       body.UsoMaximo,
		FechaInicio:     body.FechaInicio,
		FechaExpiracion: body.FechaExpiracion,
	})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(201, resp)
}

// GET /api/cupones
// Query params:
//   - restaurante_id  int    (0 = todos)
//   - solo_activos    bool
//   - solo_autorizados bool
//   - codigo          string
//   - fecha_desde     string (ISO 8601)
//   - fecha_hasta     string (ISO 8601)
// Acceso: público
func (h *RestaurantHandler) GetCupones(c *gin.Context) {
	restauranteID, _ := strconv.Atoi(c.DefaultQuery("restaurante_id", "0"))
	soloActivos := c.DefaultQuery("solo_activos", "false") == "true"
	soloAutorizados := c.DefaultQuery("solo_autorizados", "false") == "true"

	resp, err := h.restaurantClient.GetCupones(c, &restaurantpb.GetCuponesRequest{
		RestauranteId:   int32(restauranteID),
		SoloActivos:     soloActivos,
		SoloAutorizados: soloAutorizados,
		Codigo:          c.DefaultQuery("codigo", ""),
		FechaDesde:      c.DefaultQuery("fecha_desde", ""),
		FechaHasta:      c.DefaultQuery("fecha_hasta", ""),
	})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	if resp.Cupones == nil {
		c.JSON(200, gin.H{"cupones": []interface{}{}})
		return
	}

	c.JSON(200, gin.H{"cupones": resp.Cupones})
}

// PUT /api/cupones/:id
// Acceso: restaurante autenticado — NO puede cambiar Autorizado
func (h *RestaurantHandler) UpdateCupon(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "id inválido"})
		return
	}

	var body struct {
		Titulo          string  `json:"titulo"`
		Descripcion     string  `json:"descripcion"`
		Valor           float64 `json:"valor"`
		UsoMaximo       int32   `json:"uso_maximo"`
		FechaInicio     string  `json:"fecha_inicio"`
		FechaExpiracion string  `json:"fecha_expiracion"`
		Activo          bool    `json:"activo"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.restaurantClient.UpdateCupon(c, &restaurantpb.UpdateCuponRequest{
		Id:              int32(id),
		Titulo:          body.Titulo,
		Descripcion:     body.Descripcion,
		Valor:           body.Valor,
		UsoMaximo:       body.UsoMaximo,
		FechaInicio:     body.FechaInicio,
		FechaExpiracion: body.FechaExpiracion,
		Activo:          body.Activo,
	})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp)
}

// PATCH /api/cupones/:id/autorizar
// Acceso: solo administrador
func (h *RestaurantHandler) AutorizarCupon(c *gin.Context) {
	id, err := strconv.Atoi(c.Param("id"))
	if err != nil {
		c.JSON(400, gin.H{"error": "id inválido"})
		return
	}

	var body struct {
		Autorizado bool `json:"autorizado"`
	}

	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	resp, err := h.restaurantClient.AutorizarCupon(c, &restaurantpb.AutorizarCuponRequest{
		Id:         int32(id),
		Autorizado: body.Autorizado,
	})
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}

	c.JSON(200, resp)
}

// POST /api/cupones/:id/incrementar-uso
// Acceso: solo cliente autenticado
func (h *RestaurantHandler) IncrementarUsoCupon(c *gin.Context) {
	role, _ := c.Get("role")
	if role != "CLIENTE" {
		c.JSON(http.StatusForbidden, gin.H{"error": "acceso denegado: solo clientes pueden usar esta acción"})
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}

	resp, err := h.restaurantClient.IncrementarUsoCupon(c, &restaurantpb.IncrementarUsoCuponRequest{
		Id: int32(id),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// POST /api/cupones/:id/verificar-expiracion
// Acceso: solo cliente autenticado
func (h *RestaurantHandler) VerificarExpiracionCupon(c *gin.Context) {
	role, _ := c.Get("role")
	if role != "CLIENTE" {
		c.JSON(http.StatusForbidden, gin.H{"error": "acceso denegado: solo clientes pueden usar esta acción"})
		return
	}

	id, err := strconv.Atoi(c.Param("id"))
	if err != nil || id <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}

	resp, err := h.restaurantClient.VerificarExpiracionCupon(c, &restaurantpb.VerificarExpiracionCuponRequest{
		Id: int32(id),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}
