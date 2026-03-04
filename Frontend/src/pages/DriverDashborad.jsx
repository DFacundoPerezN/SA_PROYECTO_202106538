import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { authService } from '../services/api'
import { imageUploadService } from '../services/imageUpload'
import api from '../services/api'
import styles from '../styles/DriverDashboard.module.css'

const DriverDashboard = () => {
  const navigate = useNavigate()
  const user = authService.getCurrentUser()

  const [activeTab, setActiveTab] = useState('available') // 'available' o 'myOrders'
  const [availableOrders, setAvailableOrders] = useState([])
  const [myOrders, setMyOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  // Estados para imagen
  const [showImageModal, setShowImageModal] = useState(false)
  const [selectedOrderForImage, setSelectedOrderForImage] = useState(null)
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Modal para cancelar
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [cancelReason, setCancelReason] = useState('')

  useEffect(() => {
    if (activeTab === 'available') {
      fetchAvailableOrders()
    } else {
      fetchMyOrders()
    }
  }, [activeTab])

  const fetchAvailableOrders = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/orders/available')
      setAvailableOrders(response.data || [])
      setError('')
    } catch (err) {
      console.error('Error fetching available orders:', err)
      setError('Error al cargar órdenes disponibles')
    } finally {
      setLoading(false)
    }
  }

  const fetchMyOrders = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/orders/driver/me')
      setMyOrders(response.data || [])
      setError('')
    } catch (err) {
      console.error('Error fetching my orders:', err)
      setError('Error al cargar mis órdenes')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    authService.logout()
    navigate('/login')
  }

  const handleAssignOrder = async (orderId) => {
    try {
      await api.put(`/api/orders/${orderId}/assign`)
      alert('¡Orden asignada exitosamente!')
      fetchAvailableOrders()
      setActiveTab('myOrders')
    } catch (err) {
      console.error('Error assigning order:', err)
      alert('Error al asignar orden: ' + (err.response?.data?.error || err.message))
    }
  }

const openImageModal = (order) => {
  setSelectedOrderForImage(order)
  setShowImageModal(true)
  setSelectedImage(null)
  setImagePreview(null)
}

const handleImageSelect = (event) => {
  const file = event.target.files[0]
  
  if (!file) return
  
  try {
    // Validar imagen
    imageUploadService.validateImage(file)
    
    // Preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setImagePreview(e.target.result)
    }
    reader.readAsDataURL(file)
    
    setSelectedImage(file)
  } catch (error) {
    alert(error.message)
    event.target.value = ''
  }
}

const handleDeliverWithImage = async () => {
  if (!selectedImage) {
    alert('Por favor selecciona una imagen de prueba de entrega')
    return
  }

  setUploadingImage(true)
  setError('')

  try {
    // Opción 1: Subir a Azure Blob Storage
    const imageUrl = await imageUploadService.uploadToImgBB(selectedImage)
    console.log('Imagen subida a ImgBB:', imageUrl)
    // Opción 2: Convertir a base64 y enviar al backend
    // const base64Image = await imageUploadService.uploadAsBase64(selectedImage)
    
    // Enviar imagen al backend
    await api.post(`/api/orders/${selectedOrderForImage.id}/image`, {
      image_url: imageUrl
    })
    
    // Marcar como entregada
    await api.patch(`/api/orders/${selectedOrderForImage.id}/status`, { 
      status: 'ENTREGADA' 
    })
    
    alert('¡Orden entregada exitosamente!')
    setShowImageModal(false)
    setSelectedOrderForImage(null)
    setSelectedImage(null)
    setImagePreview(null)
    fetchMyOrders()
    
  } catch (err) {
    console.error('Error delivering order:', err)
    const errorMessage = err.response?.data?.error || 'Error al entregar la orden'
    setError(errorMessage)
    alert('Error: ' + errorMessage)
  } finally {
    setUploadingImage(false)
  }
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
      alert('Orden cancelada')
      fetchMyOrders()
    } catch (err) {
      console.error('Error canceling order:', err)
      alert('Error al cancelar: ' + (err.response?.data?.error || err.message))
    }
  }

  const getStatusClass = (status) => {
    const statusMap = {
      'TERMINADA': styles.statusTerminada,
      'EN_CAMINO': styles.statusEnCamino,
      'ENTREGADA': styles.statusEntregada,
      'CANCELADA': styles.statusCancelada
    }
    return statusMap[status] || ''
  }

  return (
    <div className={styles.container}>
      <nav className={styles.nav}>
        <div className={styles.navBrand}>
          <div className={styles.logo}>🚚 :)</div>
          <div className={styles.logoText}>Panel Repartidor</div>
        </div>
        <div className={styles.navUser}>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.email}</span>
            <span className={styles.userRole}>Repartidor</span>
          </div>
          <button onClick={handleLogout} className={styles.btnLogout}>
            Cerrar Sesión
          </button>
        </div>
      </nav>

      <div className={styles.content}>
        <div className={styles.header}>
          <h1>Mis Entregas</h1>
          <p>Gestiona tus órdenes de entrega</p>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'available' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('available')}
          >
            0. Órdenes Disponibles
          </button>
          <button 
            className={`${styles.tabBtn} ${activeTab === 'myOrders' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('myOrders')}
          >
            * Mis Órdenes
          </button>
        </div>

        {error && (
          <div className={`${styles.alert} ${styles.alertError}`}>
            {error}
          </div>
        )}

        {/* TAB: Órdenes Disponibles */}
        {activeTab === 'available' && (
          <>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Cargando órdenes disponibles...</p>
              </div>
            ) : availableOrders.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>📦</div>
                <p>No hay órdenes disponibles</p>
                <small>Las órdenes listas para entregar aparecerán aquí</small>
              </div>
            ) : (
              <div className={styles.ordersList}>
                {availableOrders.map(order => (
                  <div key={order.id} className={styles.orderCard}>
                    <div className={styles.orderHeader}>
                      <div className={styles.orderInfo}>
                        <h3>Orden #{order.id}</h3>
                        <div className={styles.orderMeta}>
                          {order.restaurante_nombre}
                        </div>
                      </div>
                      <span className={`${styles.statusBadge} ${getStatusClass(order.estado)}`}>
                        {order.estado}
                      </span>
                    </div>

                    <div className={styles.orderDetails}>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Cliente:</span>
                        <span className={styles.detailValue}>{order.cliente_nombre}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Dirección:</span>
                        <span className={styles.detailValue}>{order.direccion_entrega}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Total:</span>
                        <span className={styles.detailValue}>${order.costo_total.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className={styles.orderActions}>
                      <button 
                        className={`${styles.btn} ${styles.btnAssign}`}
                        onClick={() => handleAssignOrder(order.id)}
                      >
                        ♦ Tomar Esta Orden
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TAB: Mis Órdenes */}
        {activeTab === 'myOrders' && (
          <>
            {loading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Cargando mis órdenes...</p>
              </div>
            ) : myOrders.length === 0 ? (
              <div className={styles.empty}>
                <div className={styles.emptyIcon}>🚚</div>
                <p>No tienes órdenes asignadas</p>
                <small>Ve a "Órdenes Disponibles" para tomar una orden</small>
              </div>
            ) : (
              <div className={styles.ordersList}>
                {myOrders.map(order => (
                  <div key={order.id} className={styles.orderCard}>
                    <div className={styles.orderHeader}>
                      <div className={styles.orderInfo}>
                        <h3>Orden #{order.id}</h3>
                        <div className={styles.orderMeta}>
                          {order.restaurante_nombre}
                        </div>
                      </div>
                      <span className={`${styles.statusBadge} ${getStatusClass(order.estado)}`}>
                        {order.estado.replace('_', ' ')}
                      </span>
                    </div>

                    <div className={styles.orderDetails}>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Cliente:</span>
                        <span className={styles.detailValue}>{order.cliente_nombre || 'N/A'}</span>
                      </div>
                      {order.cliente_telefono && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Teléfono:</span>
                          <span className={styles.detailValue}>{order.cliente_telefono}</span>
                        </div>
                      )}
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Dirección:</span>
                        <span className={styles.detailValue}>{order.direccion_entrega}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Total:</span>
                        <span className={styles.detailValue}>${order.costo_total.toFixed(2)}</span>
                      </div>
                    </div>

                    {order.estado === 'EN_CAMINO' && (
                      <div className={styles.orderActions}>
                        <button 
                          className={`${styles.btn} ${styles.btnDeliver}`}
                          onClick={() => openImageModal(order)}
                        >
                          + Entregar con Foto
                        </button>
                        <button 
                          className={`${styles.btn} ${styles.btnCancel}`}
                          onClick={() => openCancelModal(order)}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}

                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {/* Modal Subir Imagen */}
      {showImageModal && (
        <div className={styles.modal} onClick={() => setShowImageModal(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalHeader}>
              Foto de Entrega - Orden #{selectedOrderForImage?.id}
            </h3>
            
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>
                Toma una foto del pedido entregado *
              </label>
              
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleImageSelect}
                style={{ display: 'none' }}
                id="image-upload"
              />
              
              <label 
                htmlFor="image-upload"
                style={{
                  display: 'block',
                  padding: '3rem 1rem',
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  backgroundColor: '#f9f9f9',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#2196f3'
                  e.currentTarget.style.backgroundColor = '#f0f8ff'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = '#ddd'
                  e.currentTarget.style.backgroundColor = '#f9f9f9'
                }}
              >
                {imagePreview ? (
                  <div>
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      style={{ 
                        maxWidth: '100%', 
                        maxHeight: '300px',
                        borderRadius: '8px',
                        marginBottom: '1rem'
                      }} 
                    />
                    <p style={{ color: '#2196f3', fontSize: '0.875rem' }}>
                      ✓ Imagen seleccionada - Click para cambiar
                    </p>
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>📸</div>
                    <p style={{ color: '#666', marginBottom: '0.5rem' }}>
                      Click para tomar foto o seleccionar imagen
                    </p>
                    <small style={{ color: '#999' }}>
                      JPG, PNG o WEBP - Máximo 5MB
                    </small>
                  </div>
                )}
              </label>
              
              <small style={{ 
                display: 'block', 
                marginTop: '0.5rem', 
                color: '#666',
                fontSize: '0.8rem'
              }}>
                Esta foto será la prueba de que el pedido fue entregado
              </small>
            </div>

            {error && (
              <div className={`${styles.alert} ${styles.alertError}`}>
                {error}
              </div>
            )}

            <div className={styles.modalActions}>
              <button 
                className={styles.btnSecondary}
                onClick={() => {
                  setShowImageModal(false)
                  setSelectedImage(null)
                  setImagePreview(null)
                }}
                disabled={uploadingImage}
              >
                Cancelar
              </button>
              <button 
                className={`${styles.btn} ${styles.btnDeliver}`}
                onClick={handleDeliverWithImage}
                disabled={!selectedImage || uploadingImage}
              >
                {uploadingImage ? 'Subiendo...' : '✓ Confirmar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                placeholder="Ej: No se pudo contactar al cliente"
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

export default DriverDashboard