# 🚀 DeliveryApp - Frontend

Aplicación de deliveries construida con React + Vite.

## 📋 Requisitos Previos

- Node.js (v18 o superior)
- npm o yarn
- Backend API corriendo (por defecto en `http://127.0.0.1:8080`)

## 🛠️ Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Configurar la URL del backend:
Edita el archivo `src/services/api.js` y actualiza la variable `API_BASE_URL` con la URL de tu backend:
```javascript
const API_BASE_URL = 'http://127.0.0.1:8080' // Cambia esto a tu URL
```

## Uso

### Modo desarrollo
```bash
npm run dev
```
La aplicación estará disponible en `http:///127.0.0.1:3000`

### Build para producción
```bash
npm run build
```

### Preview del build
```bash
npm run preview
```

## 📁 Estructura del Proyecto

```
delivery-app/
├── public/              # Archivos estáticos
├── src/
│   ├── components/      # Componentes reutilizables
│   │   └── ProtectedRoute.jsx
│   ├── pages/           # Páginas de la aplicación
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── AdminDashboard.jsx
│   │   └── ClienteDashboard.jsx
│   ├── services/        # Servicios y API
│   │   └── api.js
│   ├── styles/          # Archivos CSS
│   │   ├── index.css
│   │   ├── Auth.css
│   │   └── Dashboard.css
│   ├── App.jsx          # Componente principal con rutas
│   └── main.jsx         # Punto de entrada
├── index.html
├── package.json
└── vite.config.js
```

## 🔐 Autenticación

La aplicación utiliza JWT (JSON Web Tokens) para la autenticación:

- El token se almacena en `localStorage` después del login
- Se incluye automáticamente en todas las peticiones HTTP
- Expira según la configuración del backend
- Se redirige al login si el token es inválido o expira

## 🎯 Rutas Disponibles

- `/` - Redirige al login
- `/login` - Página de inicio de sesión
- `/register` - Página de registro
- `/admin/dashboard` - Dashboard del administrador (requiere rol ADMIN)
- `/cliente/dashboard` - Dashboard del cliente (requiere rol CLIENTE)

## 🔒 Rutas Protegidas

Las rutas `/admin/dashboard` y `/cliente/dashboard` están protegidas y requieren:
1. Estar autenticado (tener un token válido)
2. Tener el rol correspondiente (ADMIN o CLIENTE)

Si un usuario intenta acceder a una ruta sin permiso, será redirigido automáticamente.

## 🎨 Características de Diseño

- **Tema oscuro moderno** con gradientes
- **Animaciones fluidas** y transiciones
- **Diseño responsive** para móviles y tablets
- **Tipografía personalizada** (Outfit + Poppins)
- **Efectos visuales** con glassmorphism

## 📡 Integración con Backend

El frontend se conecta con los siguientes endpoints:

### Autenticación
- `POST /auth/login` - Inicio de sesión
- `POST /api/users/` - Registro de usuario

### Headers automáticos
Todas las peticiones autenticadas incluyen:
```javascript
Authorization: Bearer {token}
```

## 🔄 Estado de la Aplicación

El estado se maneja usando:
- `localStorage` para persistir token y datos del usuario
- React hooks (`useState`) para estado local de componentes
- React Router para navegación

## 🛡️ Seguridad

- Tokens JWT seguros
- Validación de roles en el frontend y backend
- Redirección automática en caso de sesión expirada
- Sanitización de inputs en formularios

## 🎭 Roles de Usuario

### CLIENTE
- Acceso a su dashboard personal
- Búsqueda de restaurantes
- Gestión de pedidos (próximamente)
- Lista de favoritos (próximamente)

### ADMIN
- Panel de administración
- Estadísticas del sistema
- Gestión de usuarios (próximamente)
- Gestión de productos (próximamente)
- Configuración general (próximamente)

## 🚧 Próximas Funcionalidades

- [ ] Sistema de pedidos completo
- [ ] Carrito de compras
- [ ] Seguimiento en tiempo real
- [ ] Notificaciones
- [ ] Gestión de perfiles
- [ ] Historial de pedidos
- [ ] Sistema de reviews
- [ ] Métodos de pago

## 🐛 Solución de Problemas

### El backend no responde
- Verifica que el backend esté corriendo
- Confirma la URL en `src/services/api.js`
- Revisa la consola del navegador para errores

### Error de CORS
- Configura CORS en tu backend para permitir peticiones desde `http:///127.0.0.1:3000`

### Token expirado
- El usuario será redirigido automáticamente al login
- Los tokens deben ser renovados según la configuración del backend

## 📝 Notas de Desarrollo

- Este proyecto usa Vite para un desarrollo más rápido
- Hot Module Replacement (HMR) habilitado
- ESLint configurado para mantener calidad de código
- Optimización automática en build de producción

## 👥 Contribuir

Para contribuir al proyecto:
1. Crea una rama feature
2. Realiza tus cambios
3. Crea un Pull Request

## 📄 Licencia

Este proyecto es parte de un sistema de deliveries privado.
