import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api, { authService } from '../services/api'
import { orderService } from '../services/orderService'
import { ratingService } from '../services/ratingService'
import styles from '../styles/ClienteRatings.module.css'

const parseId = (value) => Number.parseInt(value, 10)

const normalizeStatus = (value) => String(value || '').toUpperCase()

const parseError = (error, fallbackMessage) => {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallbackMessage
  )
}

const formatOrderDate = (value) => {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString('es-GT', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

const extractOrderId = (order) => Number(order?.id ?? order?.order_id ?? order?.orderId ?? 0)

const extractOrderStatus = (order) => order?.estado ?? order?.status ?? order?.estado_orden ?? ''

const extractRestaurantId = (order) => {
  return Number(order?.restaurante_id ?? order?.restaurant_id ?? order?.restauranteId ?? order?.restaurantId ?? 0)
}

const extractRestaurantName = (order) => {
  return order?.restaurante_nombre ?? order?.restaurant_name ?? order?.restauranteNombre ?? order?.restaurantName ?? 'Restaurante sin nombre'
}

const extractDriverId = (order) => Number(order?.repartidor_id ?? order?.driver_id ?? order?.repartidorId ?? order?.driverId ?? 0)

const extractOrderDate = (order) => order?.fecha_creacion ?? order?.created_at ?? order?.fechaCreacion ?? order?.createdAt ?? ''

const extractOrderProducts = (order) => {
  const source = order?.productos ?? order?.products ?? order?.items ?? []
  if (!Array.isArray(source)) {
    return []
  }

  return source
    .map((product) => {
      const productId = Number(
        product?.producto_id ??
          product?.product_id ??
          product?.productoId ??
          product?.productId ??
          product?.id ??
          0
      )

      const name =
        product?.nombre_producto ??
        product?.product_name ??
        product?.nombreProducto ??
        product?.productName ??
        (productId > 0 ? `Producto #${productId}` : 'Producto sin nombre')

      const quantity = Number(product?.cantidad ?? product?.quantity ?? 0)

      return {
        productId,
        name,
        quantity,
      }
    })
    .filter((product) => product.productId > 0)
}

const isCompletedOrder = (order) => {
  const status = normalizeStatus(extractOrderStatus(order))
  if (!status) {
    return true
  }

  return ['ENTREGADA', 'DELIVERED', 'COMPLETADA', 'COMPLETED'].includes(status)
}

const StarSelector = ({ value, onChange, labelPrefix }) => {
  return (
    <div className={styles.starSelector} role="radiogroup" aria-label={`${labelPrefix} estrellas`}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} estrellas`}
            className={`${styles.starButton} ${active ? styles.starButtonActive : ''}`}
            onClick={() => onChange(star)}
          >
            {active ? '★' : '☆'}
          </button>
        )
      })}
      <span className={styles.starValue}>{value}/5</span>
    </div>
  )
}

const ClienteRatings = () => {
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  const [completedOrders, setCompletedOrders] = useState([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState(null)

  const [driversById, setDriversById] = useState({})

  const [driverForm, setDriverForm] = useState({
    stars: 5,
    comment: '',
  })
  const [restaurantForm, setRestaurantForm] = useState({
    stars: 5,
    comment: '',
  })
  const [productForm, setProductForm] = useState({
    product_id: '',
    recommended: true,
  })

  const [driverLoading, setDriverLoading] = useState(false)
  const [restaurantLoading, setRestaurantLoading] = useState(false)
  const [productLoading, setProductLoading] = useState(false)

  const [driverMessage, setDriverMessage] = useState('')
  const [restaurantMessage, setRestaurantMessage] = useState('')
  const [productMessage, setProductMessage] = useState('')

  const [driverError, setDriverError] = useState('')
  const [restaurantError, setRestaurantError] = useState('')
  const [productError, setProductError] = useState('')

  const [driverAverage, setDriverAverage] = useState(null)
  const [restaurantAverage, setRestaurantAverage] = useState(null)
  const [productRecommendation, setProductRecommendation] = useState(null)

  const selectedOrder = useMemo(() => {
    return completedOrders.find((order) => extractOrderId(order) === selectedOrderId) || null
  }, [completedOrders, selectedOrderId])

  const selectedDriverId = selectedOrder ? extractDriverId(selectedOrder) : 0
  const selectedRestaurantId = selectedOrder ? extractRestaurantId(selectedOrder) : 0

  const selectedOrderProducts = useMemo(() => {
    return selectedOrder ? extractOrderProducts(selectedOrder) : []
  }, [selectedOrder])

  const selectedProductId = parseId(productForm.product_id)
  const selectedProduct = useMemo(() => {
    return selectedOrderProducts.find((product) => product.productId === selectedProductId) || null
  }, [selectedOrderProducts, selectedProductId])

  const selectedDriverName = selectedDriverId > 0 ? driversById[selectedDriverId] || `Repartidor #${selectedDriverId}` : 'Sin repartidor asignado'

  const clearDriverFeedback = () => {
    setDriverMessage('')
    setDriverError('')
    setDriverAverage(null)
  }

  const clearRestaurantFeedback = () => {
    setRestaurantMessage('')
    setRestaurantError('')
    setRestaurantAverage(null)
  }

  const resetRatingForms = () => {
    setDriverForm({ stars: 5, comment: '' })
    setRestaurantForm({ stars: 5, comment: '' })
    setProductForm({ product_id: '', recommended: true })
    setProductMessage('')
    setProductError('')
    setProductRecommendation(null)
    clearDriverFeedback()
    clearRestaurantFeedback()
  }

  const hydrateProductSelection = (order) => {
    const products = extractOrderProducts(order)
    const firstProduct = products.find((product) => product.productId > 0)
    setProductForm((previous) => ({
      ...previous,
      product_id: firstProduct ? String(firstProduct.productId) : '',
    }))
  }

  const fetchDriverDirectory = async () => {
    try {
      const response = await api.get('/api/users?page=1&pageSize=500&role=REPARTIDOR')
      const users = response?.data?.data || []
      const map = {}

      users.forEach((driver) => {
        const driverId = Number(driver?.id)
        if (driverId > 0) {
          map[driverId] = driver?.nombre_completo || driver?.name || driver?.email || `Repartidor #${driverId}`
        }
      })

      setDriversById(map)
    } catch (error) {
      console.error('No se pudo cargar el directorio de repartidores', error)
      setDriversById({})
    }
  }

  const fetchCompletedOrders = async () => {
    try {
      setOrdersLoading(true)
      setOrdersError('')

      const response = await orderService.getDeliveredOrders()
      const ordersPayload = Array.isArray(response) ? response : response?.orders || []
      const filteredOrders = ordersPayload.filter(isCompletedOrder)

      const initialOrder = filteredOrders.length > 0 ? filteredOrders[0] : null

      setCompletedOrders(filteredOrders)
      setSelectedOrderId((previousId) => {
        if (previousId && filteredOrders.some((order) => extractOrderId(order) === previousId)) {
          const persistedOrder = filteredOrders.find((order) => extractOrderId(order) === previousId)
          if (persistedOrder) {
            hydrateProductSelection(persistedOrder)
          }
          return previousId
        }

        if (initialOrder) {
          hydrateProductSelection(initialOrder)
          return extractOrderId(initialOrder)
        }

        return null
      })

      if (filteredOrders.length === 0) {
        resetRatingForms()
      }
    } catch (error) {
      setOrdersError(parseError(error, 'No se pudo cargar tu historial de ordenes completadas'))
      setCompletedOrders([])
      setSelectedOrderId(null)
      resetRatingForms()
    } finally {
      setOrdersLoading(false)
    }
  }

  useEffect(() => {
    fetchCompletedOrders()
    fetchDriverDirectory()
  }, [])

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  const handleOrderSelect = (orderId) => {
    if (orderId === selectedOrderId) {
      return
    }

    setSelectedOrderId(orderId)
    resetRatingForms()

    const order = completedOrders.find((item) => extractOrderId(item) === orderId)
    if (order) {
      hydrateProductSelection(order)
    }
  }

  const fetchDriverAverage = async (driverIdOverride) => {
    const driverId = Number(driverIdOverride || selectedDriverId)
    if (!Number.isInteger(driverId) || driverId <= 0) {
      setDriverError('La orden seleccionada no tiene repartidor para consultar promedio')
      return
    }

    try {
      setDriverLoading(true)
      setDriverError('')
      const data = await ratingService.getDriverAverage(driverId)
      setDriverAverage(data)
    } catch (error) {
      setDriverError(parseError(error, 'No se pudo obtener el promedio del repartidor'))
    } finally {
      setDriverLoading(false)
    }
  }

  const handleDriverSubmit = async (event) => {
    event.preventDefault()

    if (!selectedOrder) {
      setDriverError('Selecciona una orden completada para calificar al repartidor')
      return
    }

    if (!Number.isInteger(selectedDriverId) || selectedDriverId <= 0) {
      setDriverError('La orden seleccionada no tiene un repartidor asignado')
      return
    }

    if (!driverForm.comment.trim()) {
      setDriverError('El comentario es obligatorio')
      return
    }

    try {
      setDriverLoading(true)
      setDriverError('')
      setDriverMessage('')

      const response = await ratingService.rateDriver({
        driver_id: selectedDriverId,
        stars: driverForm.stars,
        comment: driverForm.comment.trim(),
      })

      setDriverMessage(response?.message || 'Calificacion registrada')
      await fetchDriverAverage(selectedDriverId)
    } catch (error) {
      setDriverError(parseError(error, 'No se pudo registrar la calificacion del repartidor'))
    } finally {
      setDriverLoading(false)
    }
  }

  const fetchRestaurantAverage = async (restaurantIdOverride) => {
    const restaurantId = Number(restaurantIdOverride || selectedRestaurantId)
    if (!Number.isInteger(restaurantId) || restaurantId <= 0) {
      setRestaurantError('La orden seleccionada no tiene restaurante para consultar promedio')
      return
    }

    try {
      setRestaurantLoading(true)
      setRestaurantError('')
      const data = await ratingService.getRestaurantAverage(restaurantId)
      setRestaurantAverage(data)
    } catch (error) {
      setRestaurantError(parseError(error, 'No se pudo obtener el promedio del restaurante'))
    } finally {
      setRestaurantLoading(false)
    }
  }

  const handleRestaurantSubmit = async (event) => {
    event.preventDefault()

    if (!selectedOrder) {
      setRestaurantError('Selecciona una orden completada para calificar al restaurante')
      return
    }

    if (!Number.isInteger(selectedRestaurantId) || selectedRestaurantId <= 0) {
      setRestaurantError('La orden seleccionada no tiene restaurante asignado')
      return
    }

    if (!restaurantForm.comment.trim()) {
      setRestaurantError('El comentario es obligatorio')
      return
    }

    try {
      setRestaurantLoading(true)
      setRestaurantError('')
      setRestaurantMessage('')

      const response = await ratingService.rateRestaurant({
        restaurant_id: selectedRestaurantId,
        stars: restaurantForm.stars,
        comment: restaurantForm.comment.trim(),
      })

      setRestaurantMessage(response?.message || 'Calificacion registrada')
      await fetchRestaurantAverage(selectedRestaurantId)
    } catch (error) {
      setRestaurantError(parseError(error, 'No se pudo registrar la calificacion del restaurante'))
    } finally {
      setRestaurantLoading(false)
    }
  }

  const handleProductSubmit = async (event) => {
    event.preventDefault()

    if (!selectedOrder) {
      setProductError('Selecciona una orden completada para recomendar un producto')
      return
    }

    const productId = selectedProductId
    if (!Number.isInteger(productId) || productId <= 0) {
      setProductError('Selecciona un producto valido de la orden')
      return
    }

    try {
      setProductLoading(true)
      setProductError('')
      setProductMessage('')

      const response = await ratingService.recommendProduct({
        product_id: productId,
        recommended: productForm.recommended,
      })

      setProductMessage(response?.message || 'Recomendacion registrada')
      await fetchProductRecommendation(productId)
    } catch (error) {
      setProductError(parseError(error, 'No se pudo registrar la recomendacion del producto'))
    } finally {
      setProductLoading(false)
    }
  }

  const fetchProductRecommendation = async (productIdOverride) => {
    const productId = parseId(productIdOverride ?? selectedProductId)
    if (!Number.isInteger(productId) || productId <= 0) {
      setProductError('Selecciona un producto valido para consultar porcentaje')
      return
    }

    try {
      setProductLoading(true)
      setProductError('')
      const data = await ratingService.getProductRecommendation(productId)
      setProductRecommendation(data)
    } catch (error) {
      setProductError(parseError(error, 'No se pudo obtener el porcentaje de recomendacion'))
    } finally {
      setProductLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>⭐</span>
          <span className={styles.brandText}>Sistema de Calificaciones</span>
        </div>

        <div className={styles.navActions}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.nombre_completo || user?.name || user?.email}</span>
            <span className={styles.userRole}>Cliente</span>
          </div>
          <button className={styles.btnGhost} onClick={() => navigate('/cliente/dashboard')}>
            Volver al Dashboard
          </button>
          <button className={styles.btnGhost} onClick={handleLogout}>
            Cerrar Sesion
          </button>
        </div>
      </nav>

      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Califica tus ordenes completadas</h1>
          <p>Selecciona una orden entregada y califica desde ahi a tu repartidor y al restaurante.</p>
        </header>

        <div className={styles.grid}>
          <section className={`${styles.card} ${styles.orderHistoryCard}`}>
            <div className={styles.orderHistoryHeader}>
              <div>
                <h2>Historial de ordenes completadas</h2>
                <p className={styles.cardDescription}>Solo se muestran ordenes entregadas del cliente actual.</p>
              </div>
              <button className={styles.btnSecondary} type="button" onClick={fetchCompletedOrders} disabled={ordersLoading}>
                {ordersLoading ? 'Actualizando...' : 'Actualizar historial'}
              </button>
            </div>

            {ordersError && <p className={styles.errorText}>{ordersError}</p>}

            {ordersLoading ? (
              <p className={styles.cardDescription}>Cargando ordenes completadas...</p>
            ) : completedOrders.length === 0 ? (
              <p className={styles.cardDescription}>No tienes ordenes entregadas para calificar por ahora.</p>
            ) : (
              <div className={styles.orderList}>
                {completedOrders.map((order) => {
                  const orderId = extractOrderId(order)
                  const isSelected = orderId === selectedOrderId
                  const driverId = extractDriverId(order)
                  const driverName = driverId > 0 ? driversById[driverId] || `Repartidor #${driverId}` : 'Sin repartidor asignado'
                  const createdAt = formatOrderDate(extractOrderDate(order))

                  return (
                    <button
                      key={orderId}
                      type="button"
                      className={`${styles.orderItem} ${isSelected ? styles.orderItemActive : ''}`}
                      onClick={() => handleOrderSelect(orderId)}
                    >
                      <div className={styles.orderItemHeader}>
                        <span className={styles.orderItemTitle}>Orden #{orderId}</span>
                        <span className={styles.statusPill}>Completada</span>
                      </div>
                      <span className={styles.orderItemMeta}>{extractRestaurantName(order)}</span>
                      <span className={styles.orderItemMeta}>{driverName}</span>
                      {createdAt && <span className={styles.orderItemMeta}>{createdAt}</span>}
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2>Calificacion al Repartidor</h2>
            {selectedOrder ? (
              <p className={styles.cardDescription}>
                Orden #{extractOrderId(selectedOrder)} | {selectedDriverName}
              </p>
            ) : (
              <p className={styles.cardDescription}>Selecciona una orden completada para habilitar esta calificacion.</p>
            )}

            <form className={styles.form} onSubmit={handleDriverSubmit}>
              <label className={styles.label}>Estrellas (1-5)</label>
              <StarSelector
                value={driverForm.stars}
                onChange={(stars) => setDriverForm({ ...driverForm, stars })}
                labelPrefix="Calificacion de repartidor"
              />

              <label className={styles.label} htmlFor="driver-comment">
                Comentario
              </label>
              <textarea
                id="driver-comment"
                className={styles.textarea}
                value={driverForm.comment}
                onChange={(event) => setDriverForm({ ...driverForm, comment: event.target.value })}
                placeholder="Ejemplo: Entrega rapida y amable"
                rows="3"
                required
              />

              <div className={styles.actions}>
                <button
                  className={styles.btnPrimary}
                  type="submit"
                  disabled={driverLoading || !selectedOrder || selectedDriverId <= 0}
                >
                  {driverLoading ? 'Enviando...' : 'Enviar Calificacion'}
                </button>
                <button
                  className={styles.btnSecondary}
                  type="button"
                  disabled={driverLoading || !selectedOrder || selectedDriverId <= 0}
                  onClick={() => fetchDriverAverage()}
                >
                  Ver Promedio
                </button>
              </div>
            </form>

            {driverMessage && <p className={styles.successText}>{driverMessage}</p>}
            {driverError && <p className={styles.errorText}>{driverError}</p>}

            {driverAverage && (
              <div className={styles.metrics}>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Promedio</span>
                  <span className={styles.metricValue}>{Number(driverAverage.promedio || 0).toFixed(2)}</span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Total calificaciones</span>
                  <span className={styles.metricValue}>{driverAverage.total_calificaciones || 0}</span>
                </div>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2>Calificacion al Restaurante</h2>
            {selectedOrder ? (
              <p className={styles.cardDescription}>
                Orden #{extractOrderId(selectedOrder)} | {extractRestaurantName(selectedOrder)}
              </p>
            ) : (
              <p className={styles.cardDescription}>Selecciona una orden completada para habilitar esta calificacion.</p>
            )}

            <form className={styles.form} onSubmit={handleRestaurantSubmit}>
              <label className={styles.label}>Estrellas (1-5)</label>
              <StarSelector
                value={restaurantForm.stars}
                onChange={(stars) => setRestaurantForm({ ...restaurantForm, stars })}
                labelPrefix="Calificacion de restaurante"
              />

              <label className={styles.label} htmlFor="restaurant-comment">
                Comentario
              </label>
              <textarea
                id="restaurant-comment"
                className={styles.textarea}
                value={restaurantForm.comment}
                onChange={(event) => setRestaurantForm({ ...restaurantForm, comment: event.target.value })}
                placeholder="Escribe tu experiencia"
                rows="3"
                required
              />

              <div className={styles.actions}>
                <button
                  className={styles.btnPrimary}
                  type="submit"
                  disabled={restaurantLoading || !selectedOrder || selectedRestaurantId <= 0}
                >
                  {restaurantLoading ? 'Enviando...' : 'Enviar Calificacion'}
                </button>
                <button
                  className={styles.btnSecondary}
                  type="button"
                  disabled={restaurantLoading || !selectedOrder || selectedRestaurantId <= 0}
                  onClick={() => fetchRestaurantAverage()}
                >
                  Ver Promedio
                </button>
              </div>
            </form>

            {restaurantMessage && <p className={styles.successText}>{restaurantMessage}</p>}
            {restaurantError && <p className={styles.errorText}>{restaurantError}</p>}

            {restaurantAverage && (
              <div className={styles.metrics}>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Promedio</span>
                  <span className={styles.metricValue}>{Number(restaurantAverage.promedio || 0).toFixed(2)}</span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Total calificaciones</span>
                  <span className={styles.metricValue}>{restaurantAverage.total_calificaciones || 0}</span>
                </div>
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2>Calificacion al Producto</h2>
            {selectedOrder ? (
              <p className={styles.cardDescription}>
                Orden #{extractOrderId(selectedOrder)} | {selectedProduct?.name || 'Selecciona un producto de la orden'}
              </p>
            ) : (
              <p className={styles.cardDescription}>Selecciona una orden completada para recomendar un producto.</p>
            )}

            <form className={styles.form} onSubmit={handleProductSubmit}>
              <label className={styles.label} htmlFor="product-id">
                Producto
              </label>
              <select
                id="product-id"
                className={styles.input}
                value={productForm.product_id}
                onChange={(event) => setProductForm({ ...productForm, product_id: event.target.value })}
                disabled={!selectedOrder || selectedOrderProducts.length === 0}
                required
              >
                <option value="">Selecciona un producto</option>
                {selectedOrderProducts.map((product) => (
                  <option key={product.productId} value={String(product.productId)}>
                    {product.name}{product.quantity > 0 ? ` x${product.quantity}` : ''}
                  </option>
                ))}
              </select>

              <label className={styles.label}>Recomendacion</label>
              <div className={styles.recommendationBox}>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="recommended"
                    checked={productForm.recommended === true}
                    onChange={() => setProductForm({ ...productForm, recommended: true })}
                  />
                  Recomendado
                </label>
                <label className={styles.radioLabel}>
                  <input
                    type="radio"
                    name="recommended"
                    checked={productForm.recommended === false}
                    onChange={() => setProductForm({ ...productForm, recommended: false })}
                  />
                  No recomendado
                </label>
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.btnPrimary}
                  type="submit"
                  disabled={productLoading || !selectedOrder || !Number.isInteger(selectedProductId) || selectedProductId <= 0}
                >
                  {productLoading ? 'Enviando...' : 'Enviar Recomendacion'}
                </button>
                <button
                  className={styles.btnSecondary}
                  type="button"
                  disabled={productLoading || !selectedOrder || !Number.isInteger(selectedProductId) || selectedProductId <= 0}
                  onClick={() => fetchProductRecommendation()}
                >
                  Ver Porcentaje
                </button>
              </div>
            </form>

            {productMessage && <p className={styles.successText}>{productMessage}</p>}
            {productError && <p className={styles.errorText}>{productError}</p>}

            {productRecommendation && (
              <div className={styles.metrics}>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Porcentaje recomendado</span>
                  <span className={styles.metricValue}>{Number(productRecommendation.porcentaje || 0).toFixed(2)}%</span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Total recomendaciones</span>
                  <span className={styles.metricValue}>{productRecommendation.total_recomendaciones || 0}</span>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default ClienteRatings