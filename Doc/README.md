# Practica 1

## Requerimientos Funcionales

### 1. API Gateaway
- Que el Backend exponga las rutas REST para el frontend
- Hacer uso y validar tokens JWT
- Que se autorize el acceso por roles
- Enrutar a los servicios de gRPC

### 2. Login y Autentificación
- Los usuarios podrán registrarse proporcionando: email, contraseña y rol.
- Permite que un usuario existente ingrese a la plataforma utilizando su email y 
contraseña. 
- Despúes de autentificar, el servicio genera un JSON Web Token (JWT) 
que contiene la información relevante del usuario.
- Se valida que el acceso según el rol de cada usuario.

### 3. Catalogo del Restaurante
- El administrador podrá crear, leer, actualizar y eliminar restaurantes dentro de la plataforma.
- El rol de restaurante podrá crear, leer, actualizar y eliminar los ítems de menú asociados a cada restaurante.
- Los clientes podran ver un listado de restaurantes con su infomración: Nombre, tipo de comida, horario, calificación. 
- Una vez selecionado el restaurante, el cloente podrá ver el menú de este; mostrando productos activos, sus precios y descripciones.

### 4. Ordenes
- El usuario cliente puede llenar un carrito con artículos para generar ordenes que desoúes sean enviadas al restaurante.
- EL usuario cliente puede cancelar sus ordenes. 
- El restaurante debe poder visualizar las ordenes creadas por los clientes, seleccionarla para marcarla como EN PROCESO y despues de completarla marcarla como FINALIZADA/LISTA para etrega.
- El restaurante puede marcar una orden como RECHAZADA cancelandola y mostrandole al cliente el cambio.

### 5. Envios y Entrega
- Al momento de que una orden pase a estar LISTA los repartidores podrán aceptar una de estas para que pase al estado de EN CAMINO.
- Cuando el repartidor haga la entrega en el destino debe pasar el pedido a ENTREGADO pero tamién si pasa algún inconveniente la orden puede pasar al estado de CANCELADO.

### 6. Notificaciones 

- Al realizar un pedido le debe llegar un correo alcliente con un resimen del pedido:  Nombre del cliente, número de orden, productos ordenados, monto total, fecha, estado actual de la orden (CREADA).
- El usuario debe de recibir una notificación al momento 
de que la orden sea cancelada con la información: Nombre de quien cancelo, número de orden, productos ordenados, fecha de cancelacion, estado actual de la orden (CANCELADA). 
- Cuando la orden ya este en camino el cliente recibida una notificacipon por correo, con los datos: Nombre del repartidor, número de orden, productos ordenados,estado actual de la orden (EN CAMINO).
- A su vez cuando el restaurante rechace una orden debe notificarle al clietnte por un correo, mastrando la información: Nombre del restaurante, número de orden, productos ordenados,estado actual de la orden (RECHAZADA).

---

## Requerimientos no Funcionales

### Rendimiento

- El sistema debe soportar múltiples peticiones y operaciones simultáneas sin degradar la experiencia.
- La actualización de productos y estados notifica ocurriendo en tiempo real.

### Seguridad

- Los perfiles de usuario deben protegerse con contraseñas cifradas.
- La comunicación entre cliente y servidor debe realizarse bajo protocolo seguro (**HTTPS**).
- La información personal de los clientes debe cumplir con normativas de protección de datos.
- Se hace validacion de credenciales y tokes para que solo los usuarios autetificados y con el rol tengan accesos a sus respectivas funcionalidaddes.

### Escalabilidad

- El sistema debe permitir la integración de más aerolíneas y un mayor número de vuelos sin rediseños significativos.
- La arquitectura debe ser modular para facilitar la incorporación de nuevas funcionalidades.

### Disponibilidad

- El sistema debe estar disponible **24/7** con una tolerancia a fallos mínima.
- Se deben implementar respaldos automáticos de la información crítica.

### Usabilidad

- La interfaz debe ser intuitiva, accesible y **responsive** (usable desde móviles, tablets y PCs).
- El flujo de registro, reserva y check-in debe completarse en un máximo de 5 pasos.
- UX amigable con el usuario. 

### Mantenibilidad

- El código debe documentarse y seguir buenas prácticas de diseño.
- Se deben aplicar patrones de diseño y arquitectura que faciliten futuras modificaciones.

### Compatibilidad

- El sistema debe ser accesible desde navegadores modernos.
- Debe soportar integración con aplicaciones móviles en el futuro.

---

## Base de datos 

### Tabla Usuario

- Id: Identificador único del usuario dentro del sistema. (Llave primaria)
- Email (no repetido): Correo electrónico del usuario, utilizado como credencial principal para el inicio de sesión. 
- Contraseña (encriptada): Clave de acceso almacenada siempre de forma segura (encriptada/hasheada) para proteger la información del usuario. 
- Rol: Define el tipo de usuario dentro de la plataforma (CLIENTE, RESTAURANTE, REPARTIDOR, ADMINISTRADOR) y determina los permisos de acceso a las distintas funcionalidades.

### Tabla Restaurante
- Id: Identificador usuario. (Llave primaria, llave foranea)
- Nombre 
- dirección
- horarios de atención
- numero

### Producto
- Id (Llave primaria)
- Nombre del platillo 
- descripción 
- precio 
- disponibilidad (Booleano)
- Referencia a Restaurante

### Orden
- Id (Llave Primaria)
- Estado (RECHAZADA, CANCELADA, EN CAMINO, CREADA, EN PROCESO, TERMINADA/LISTA, ENTREGADA)
- FechaHoraCreacion
- IdRepartidor (puede ser NULL)

### Orden Cancelada
- IdOrden (LLave foranea, llave primaria)
- FechaCancelacion

### OrdenItem
- Id (llave primaria)
- IdOrden (Llave forarena)
- IdProducto (Llave forarena)