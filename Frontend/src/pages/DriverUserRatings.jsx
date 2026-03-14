import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { orderService } from '../services/orderService'
import { ratingService } from '../services/ratingService'
import styles from '../styles/ClienteRatings.module.css'

const extractOrderId = (order) => Number(order?.id ?? order?.order_id ?? order?.orderId ?? 0)
const extractOrderStatus = (order) => String(order?.estado ?? order?.status ?? '').toUpperCase()
const extractClientId = (order) => Number(order?.cliente_id ?? order?.client_id ?? order?.clienteId ?? order?.clientId ?? 0)
const extractClientName = (order) =>
  order?.cliente_nombre ?? order?.client_name ?? order?.clienteNombre ?? order?.clientName ?? 'Cliente sin nombre'
const extractRestaurantName = (order) =>
  order?.restaurante_nombre ?? order?.restaurant_name ?? order?.restauranteNombre ?? order?.restaurantName ?? 'Restaurante'

const parseError = (error, fallback) => {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  )
}

const StarSelector = ({ value, onChange }) => {
  return (
    <div className={styles.starSelector} role="radiogroup" aria-label="Estrellas">
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= value
        return (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
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

const DriverUserRatings = () => {
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [ordersError, setOrdersError] = useState('')
  const [selectedOrderId, setSelectedOrderId] = useState(null)

  const [form, setForm] = useState({
    stars: 5,
    comment: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [submitError, setSubmitError] = useState('')

  const [average, setAverage] = useState(null)
  const [loadingAverage, setLoadingAverage] = useState(false)

  const deliveredOrders = useMemo(() => {
    return orders.filter((order) => extractOrderStatus(order) === 'ENTREGADA')
  }, [orders])

  const selectedOrder = useMemo(() => {
    return deliveredOrders.find((order) => extractOrderId(order) === selectedOrderId) || null
  }, [deliveredOrders, selectedOrderId])

  const selectedClientId = selectedOrder ? extractClientId(selectedOrder) : 0
  const selectedClientName = selectedOrder ? extractClientName(selectedOrder) : 'Sin cliente seleccionado'

  const fetchDriverOrders = async () => {
    try {
      setLoadingOrders(true)
      setOrdersError('')

      const response = await orderService.getMyDriverOrders()
      const payload = Array.isArray(response) ? response : response?.orders || []

      setOrders(payload)

      const firstDelivered = payload.find((order) => extractOrderStatus(order) === 'ENTREGADA')
      setSelectedOrderId((current) => {
        if (current && payload.some((order) => extractOrderId(order) === current && extractOrderStatus(order) === 'ENTREGADA')) {
          return current
        }

        return firstDelivered ? extractOrderId(firstDelivered) : null
      })
    } catch (error) {
      setOrdersError(parseError(error, 'No se pudieron cargar tus órdenes entregadas'))
      setOrders([])
      setSelectedOrderId(null)
    } finally {
      setLoadingOrders(false)
    }
  }

  useEffect(() => {
    fetchDriverOrders()
  }, [])

  const handleOrderSelect = (orderId) => {
    setSelectedOrderId(orderId)
    setForm({ stars: 5, comment: '' })
    setAverage(null)
    setMessage('')
    setSubmitError('')
  }

  const fetchClientAverage = async (clientIdOverride) => {
    const clientId = Number(clientIdOverride || selectedClientId)
    if (!Number.isInteger(clientId) || clientId <= 0) {
      setSubmitError('Selecciona una orden válida para consultar promedio')
      return
    }

    try {
      setLoadingAverage(true)
      setSubmitError('')
      const data = await ratingService.getClientAverage(clientId)
      setAverage(data)
    } catch (error) {
      setSubmitError(parseError(error, 'No se pudo obtener el promedio del cliente'))
    } finally {
      setLoadingAverage(false)
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!selectedOrder) {
      setSubmitError('Selecciona una orden entregada para calificar al cliente')
      return
    }

    if (!Number.isInteger(selectedClientId) || selectedClientId <= 0) {
      setSubmitError('La orden seleccionada no tiene cliente válido')
      return
    }

    if (!form.comment.trim()) {
      setSubmitError('El comentario es obligatorio')
      return
    }

    try {
      setSubmitting(true)
      setSubmitError('')
      setMessage('')

      const response = await ratingService.rateClient({
        client_id: selectedClientId,
        order_id: extractOrderId(selectedOrder),
        stars: form.stars,
        comment: form.comment.trim(),
      })

      setMessage(response?.message || 'Calificación registrada')
      await fetchClientAverage(selectedClientId)
    } catch (error) {
      setSubmitError(parseError(error, 'No se pudo registrar la calificación del cliente'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  return (
    <div className={styles.page}>
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <span className={styles.brandIcon}>🚚</span>
          <span className={styles.brandText}>Review de Clientes</span>
        </div>

        <div className={styles.navActions}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.nombre_completo || user?.email}</span>
            <span className={styles.userRole}>Repartidor</span>
          </div>
          <button className={styles.btnGhost} onClick={() => navigate('/repartidor/dashboard')}>
            Volver al Dashboard
          </button>
          <button className={styles.btnGhost} onClick={handleLogout}>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <main className={styles.main}>
        <header className={styles.header}>
          <h1>Califica a tus clientes</h1>
          <p>Solo puedes evaluar clientes de órdenes entregadas asignadas a tu cuenta.</p>
        </header>

        <div className={styles.grid}>
          <section className={`${styles.card} ${styles.orderHistoryCard}`}>
            <div className={styles.orderHistoryHeader}>
              <div>
                <h2>Órdenes Entregadas</h2>
                <p className={styles.cardDescription}>Selecciona una orden para enviar la review del cliente.</p>
              </div>
              <button className={styles.btnSecondary} onClick={fetchDriverOrders} disabled={loadingOrders}>
                {loadingOrders ? 'Actualizando...' : 'Actualizar'}
              </button>
            </div>

            {ordersError && <p className={styles.errorText}>{ordersError}</p>}

            {loadingOrders ? (
              <p className={styles.cardDescription}>Cargando órdenes...</p>
            ) : deliveredOrders.length === 0 ? (
              <p className={styles.cardDescription}>No tienes órdenes entregadas para calificar.</p>
            ) : (
              <div className={styles.orderList}>
                {deliveredOrders.map((order) => {
                  const orderId = extractOrderId(order)
                  const isSelected = selectedOrderId === orderId

                  return (
                    <button
                      key={orderId}
                      type="button"
                      className={`${styles.orderItem} ${isSelected ? styles.orderItemActive : ''}`}
                      onClick={() => handleOrderSelect(orderId)}
                    >
                      <div className={styles.orderItemHeader}>
                        <span className={styles.orderItemTitle}>Orden #{orderId}</span>
                        <span className={styles.statusPill}>Entregada</span>
                      </div>
                      <span className={styles.orderItemMeta}>{extractClientName(order)}</span>
                      <span className={styles.orderItemMeta}>{extractRestaurantName(order)}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          <section className={styles.card}>
            <h2>Review al Cliente</h2>
            {selectedOrder ? (
              <p className={styles.cardDescription}>
                Orden #{extractOrderId(selectedOrder)} | {selectedClientName}
              </p>
            ) : (
              <p className={styles.cardDescription}>Selecciona una orden entregada para habilitar la review.</p>
            )}

            <form className={styles.form} onSubmit={handleSubmit}>
              <label className={styles.label}>Estrellas (1-5)</label>
              <StarSelector value={form.stars} onChange={(stars) => setForm({ ...form, stars })} />

              <label className={styles.label} htmlFor="client-comment">
                Comentario
              </label>
              <textarea
                id="client-comment"
                className={styles.textarea}
                value={form.comment}
                onChange={(event) => setForm({ ...form, comment: event.target.value })}
                placeholder="Ejemplo: Cliente puntual y amable"
                rows="3"
                required
              />

              <div className={styles.actions}>
                <button
                  className={styles.btnPrimary}
                  type="submit"
                  disabled={submitting || !selectedOrder || selectedClientId <= 0}
                >
                  {submitting ? 'Enviando...' : 'Enviar Review'}
                </button>
                <button
                  className={styles.btnSecondary}
                  type="button"
                  disabled={loadingAverage || !selectedOrder || selectedClientId <= 0}
                  onClick={() => fetchClientAverage()}
                >
                  {loadingAverage ? 'Consultando...' : 'Ver Promedio Cliente'}
                </button>
              </div>
            </form>

            {message && <p className={styles.successText}>{message}</p>}
            {submitError && <p className={styles.errorText}>{submitError}</p>}

            {average && (
              <div className={styles.metrics}>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Promedio cliente</span>
                  <span className={styles.metricValue}>{Number(average.promedio || 0).toFixed(2)}</span>
                </div>
                <div className={styles.metricItem}>
                  <span className={styles.metricLabel}>Total calificaciones</span>
                  <span className={styles.metricValue}>{average.total_calificaciones || 0}</span>
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  )
}

export default DriverUserRatings
