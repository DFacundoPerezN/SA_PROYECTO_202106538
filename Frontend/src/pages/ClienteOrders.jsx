import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import api from '../services/api'
import { convertService } from '../services/convertService'
import styles from '../styles/DriverDashboard.module.css' // Reutilizamos los estilos minimalistas

const ClienteOrders = () => {
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Modal para cancelar
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  // Conversión de moneda
  const [selectedCurrency, setSelectedCurrency] = useState('USD')
  const [convertedAmounts, setConvertedAmounts] = useState({})
  const [convertingLoading, setConvertingLoading] = useState(false)
  const [convertingError, setConvertingError] = useState('')

  // Monedas soportadas
  const supportedCurrencies = ['USD', 'GTQ', 'MXN', 'COP', 'PEN', 'CLP', 'ARS', 'BRL']

  useEffect(() => {
    fetchOrders()
  }, [])

  // Manejar conversión de monedas cuando cambia la moneda seleccionada
  useEffect(() => {
    if (selectedCurrency !== 'USD' && orders.length > 0) {
      convertAllOrderAmounts()
    } else {
      setConvertedAmounts({})
    }
  }, [selectedCurrency, orders])

  const convertAllOrderAmounts = async () => {
    try {
      setConvertingLoading(true)
      setConvertingError('')
      const newConvertedAmounts = {}

      for (const order of orders) {
        try {
          const result = await convertService.convertCurrency(
            order.costo_total,
            'USD',
            selectedCurrency
          )
          // La respuesta contiene amount_to que es el monto convertido
          newConvertedAmounts[order.id] = result.amount_to || result.converted_amount
        } catch (orderErr) {
          console.warn(`Error converting order ${order.id}:`, orderErr)
          // Si falla la conversión de una orden, mantenemos la cantidad original
          newConvertedAmounts[order.id] = order.costo_total
        }
      }

      setConvertedAmounts(newConvertedAmounts)
    } catch (err) {
      console.error('Error converting amounts:', err)
      setConvertingError('Error al convertir monedas')
    } finally {
      setConvertingLoading(false)
    }
  }

  const handleCurrencyChange = (e) => {
    setSelectedCurrency(e.target.value)
  }

  const getDisplayAmount = (order) => {
    if (selectedCurrency === 'USD') {
      return `$${order.costo_total.toFixed(2)} USD`
    }
    if (convertedAmounts[order.id]) {
      return `${convertedAmounts[order.id].toFixed(2)} ${selectedCurrency}`
    }
    return `$${order.costo_total.toFixed(2)} USD`
  }

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/orders/me')
      setOrders(response.data || [])
      setError('')
    } catch (err) {
      console.error('Error fetching orders:', err)
      setError('Error al cargar tus órdenes')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  const handleBack = () => {
    navigate('/cliente/dashboard')
  }

  const canCancel = (estado) => {
    return !['RECHAZADA', 'CANCELADA', 'ENTREGADA'].includes(estado)
  }

  const openCancelModal = (order) => {
    setSelectedOrder(order)
    setShowCancelModal(true)
    setCancelReason('')
  }

  const handleCancelOrder = async () => {
    if (!cancelReason.trim()) {
      alert('Por favor ingresa un motivo de cancelación')
      return
    }

    try {
      await api.post(`/api/orders/${selectedOrder.id}/cancel`, { motivo: cancelReason })
      setShowCancelModal(false)
      setSelectedOrder(null)
      setCancelReason('')
      alert('Orden cancelada exitosamente')
      fetchOrders()
    } catch (err) {
      console.error('Error canceling order:', err)
      alert('Error al cancelar: ' + (err.response?.data?.error || err.message))
    }
  }

  const getStatusClass = (status) => {
    const statusMap = {
      'CREADA': styles.statusTerminada,
      'ACEPTADA': styles.statusEnCamino,
      'EN_PREPARACION': styles.statusEnCamino,
      'TERMINADA': styles.statusTerminada,
      'EN_CAMINO': styles.statusEnCamino,
      'ENTREGADA': styles.statusEntregada,
      'RECHAZADA': styles.statusCancelada,
      'CANCELADA': styles.statusCancelada
    }
    return statusMap[status] || ''
  }

  const getStatusText = (status) => {
    const statusText = {
      'CREADA': '🔄 Pendiente',
      'ACEPTADA': '✓ Aceptada',
      'EN_PREPARACION': '👨‍🍳 En Preparación',
      'TERMINADA': '✓ Lista',
      'EN_CAMINO': '🚚 En Camino',
      'ENTREGADA': '✓ Entregada',
      'RECHAZADA': '✗ Rechazada',
      'CANCELADA': '✗ Cancelada'
    }
    return statusText[status] || status
  }

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <div className={styles.logo}>🚀</div>
          <div className={styles.logoText}>DeliveryApp</div>
        </div>
        <div className={styles.navUser}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.email}</span>
            <span className={styles.userRole}>Cliente</span>
          </div>
          <button onClick={handleLogout} className={styles.btnLogout}>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className={styles.content}>
        <div style={{ marginBottom: '1.5rem' }}>
          <button onClick={handleBack} className={styles.btnSecondary}>
            ← Volver a Restaurantes
          </button>
        </div>

        <div className={styles.header}>
          <h1>Mis Órdenes</h1>
          <p>Historial de pedidos realizados</p>
        </div>

        {/* Currency Converter */}
        <div style={{
          padding: '1rem',
          marginBottom: '1.5rem',
          backgroundColor: '#f8f9fa',
          borderRadius: '0.5rem',
          border: '1px solid #e0e0e0'
        }}>
          <label style={{
            display: 'block',
            marginBottom: '0.5rem',
            fontWeight: '600',
            color: '#333'
          }}>
             Cambiar moneda de visualización:
          </label>
          <select
            value={selectedCurrency}
            onChange={handleCurrencyChange}
            style={{
              padding: '0.5rem',
              width: '100%',
              maxWidth: '200px',
              border: '1px solid #ccc',
              borderRadius: '0.25rem',
              fontSize: '1rem',
              cursor: 'pointer'
            }}
          >
            <option value="USD">USD - Dólar Estadounidense</option>
            <option value="GTQ">GTQ - Quetzal Guatemalteco</option>
            <option value="MXN">MXN - Peso Mexicano</option>
            <option value="COP">COP - Peso Colombiano</option>
            <option value="PEN">PEN - Sol Peruano</option>
            <option value="CLP">CLP - Peso Chileno</option>
            <option value="ARS">ARS - Peso Argentino</option>
            <option value="BRL">BRL - Real Brasileño</option>
          </select>
          {convertingError && (
            <small style={{ color: '#d32f2f', display: 'block', marginTop: '0.5rem' }}>
              {convertingError}
            </small>
          )}
          {convertingLoading && selectedCurrency !== 'USD' && (
            <small style={{ color: '#1976d2', display: 'block', marginTop: '0.5rem' }}>
              ⏳ Convirtiendo monedas...
            </small>
          )}
        </div>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error}
          </div>
        )}

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Cargando tus órdenes...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🛍️</div>
            <p>No tienes órdenes</p>
            <small>Realiza tu primer pedido desde la lista de restaurantes</small>
          </div>
        ) : (
          <div className={styles.ordersList}>
            {orders.map(order => (
              <div key={order.id} className={styles.orderCard}>
                <div className={styles.orderHeader}>
                  <div className={styles.orderInfo}>
                    <h3>Orden #{order.id}</h3>
                    <div className={styles.orderMeta}>
                      {order.restaurante_nombre}
                    </div>
                  </div>
                  <span className={`${styles.statusBadge} ${getStatusClass(order.estado)}`}>
                    {getStatusText(order.estado)}
                  </span>
                </div>

                <div className={styles.orderDetails}>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Dirección de entrega:</span>
                    <span className={styles.detailValue}>{order.direccion_entrega}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Total:</span>
                    <span className={styles.detailValue}>{getDisplayAmount(order)}</span>
                  </div>
                  <div className={styles.detailRow}>
                    <span className={styles.detailLabel}>Estado:</span>
                    <span className={styles.detailValue}>{order.estado.replace('_', ' ')}</span>
                  </div>
                </div>

                {canCancel(order.estado) && (
                  <div className={styles.orderActions}>
                    <button 
                      className={`${styles.btn} ${styles.btnCancel}`}
                      onClick={() => openCancelModal(order)}
                    >
                      Cancelar Orden
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Cancelar */}
      {showCancelModal && (
        <div className={styles.modal} onClick={() => setShowCancelModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalHeader}>Cancelar Orden #{selectedOrder?.id}</h3>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>Motivo de cancelación *</label>
              <textarea
                className={styles.formInput}
                rows="3"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ej: Ya no necesito el pedido"
              />
            </div>

            <div className={styles.modalActions}>
              <button 
                className={styles.btnSecondary}
                onClick={() => setShowCancelModal(false)}
              >
                Cerrar
              </button>
              <button 
                className={`${styles.btn} ${styles.btnCancel}`}
                onClick={handleCancelOrder}
              >
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClienteOrders