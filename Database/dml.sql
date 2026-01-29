-- Administrador del sistema
INSERT INTO Usuario (Email, PasswordHash, Rol, NombreCompleto, Telefono) 
VALUES 
('admin@delivery.com', '$2a$12$hashedpassword1', 'ADMINISTRADOR', 'Carlos Administrador', '+503 2222-0000'),
('cliente1@email.com', '$2a$12$hashedpassword2', 'CLIENTE', 'Ana Martínez', '+503 7777-1111'),
('cliente2@email.com', '$2a$12$hashedpassword3', 'CLIENTE', 'Luis Rodríguez', '+503 7777-2222'),
('cliente3@email.com', '$2a$12$hashedpassword4', 'CLIENTE', 'María García', '+503 7777-3333'),
('repartidor1@email.com', '$2a$12$hashedpassword5', 'REPARTIDOR', 'José Pérez', '+503 7777-4444'),
('repartidor2@email.com', '$2a$12$hashedpassword6', 'REPARTIDOR', 'Carmen López', '+503 7777-5555'),
('repartidor3@email.com', '$2a$12$hashedpassword7', 'REPARTIDOR', 'Miguel Sánchez', '+503 7777-6666');

-- Restaurantes (también son usuarios)
INSERT INTO Usuario (Email, PasswordHash, Rol, NombreCompleto, Telefono) 
VALUES 
('pizzahut@rest.com', '$2a$12$hashedpassword8', 'RESTAURANTE', 'Pizza Hut Sucursal Centro', '+503 2222-1111'),
('mcdonalds@rest.com', '$2a$12$hashedpassword9', 'RESTAURANTE', 'McDonalds Metrocentro', '+503 2222-2222'),
('subway@rest.com', '$2a$12$hashedpassword10', 'RESTAURANTE', 'Subway Galerías', '+503 2222-3333'),
('starbucks@rest.com', '$2a$12$hashedpassword11', 'RESTAURANTE', 'Starbucks Multiplaza', '+503 2222-4444'),
('tipicos@rest.com', '$2a$12$hashedpassword12', 'RESTAURANTE', 'Comida Típica Salvadoreña', '+503 2222-5555');

INSERT INTO Restaurante (Id, Nombre, Direccion, Latitud, Longitud, HorarioApertura, HorarioCierre, Telefono, CalificacionPromedio, Activo) 
VALUES 
(8, 'Pizza Hut', 'Centro Comercial Metrocentro, San Salvador', 13.6923, -89.2184, '10:00', '22:00', '+503 2222-1111', 4.5, 1),
(9, 'McDonalds', 'Metrocentro, San Salvador', 13.6931, -89.2179, '07:00', '23:00', '+503 2222-2222', 4.2, 1),
(10, 'Subway', 'Galerías Escalón, San Salvador', 13.7001, -89.2405, '08:00', '21:00', '+503 2222-3333', 4.3, 1),
(11, 'Starbucks', 'Multiplaza, San Salvador', 13.6732, -89.2409, '06:30', '22:30', '+503 2222-4444', 4.4, 1),
(12, 'Sabores Típicos', 'Colonia Flor Blanca, San Salvador', 13.6897, -89.2432, '11:00', '20:00', '+503 2222-5555', 4.7, 1);

-- Insertar productos para cada restaurante
-- Pizza Hut
INSERT INTO Producto (Nombre, Descripcion, Precio, Disponible, RestauranteId, Categoria) 
VALUES 
('Pizza Pepperoni Mediana', 'Pizza mediana con pepperoni y queso mozzarella', 12.99, 1, 8, 'Pizzas'),
('Pizza Hawaiana Grande', 'Pizza grande con jamón y piña', 15.99, 1, 8, 'Pizzas'),
('Alitas BBQ (8 pzas)', 'Alitas de pollo con salsa BBQ', 8.99, 1, 8, 'Entradas'),
('Pasta Alfredo', 'Pasta con salsa alfredo y pollo', 10.99, 1, 8, 'Pastas'),
('Refresco 1L', 'Refresco de cola, naranja o limón', 2.99, 1, 8, 'Bebidas');

-- McDonalds
INSERT INTO Producto (Nombre, Descripcion, Precio, Disponible, RestauranteId, Categoria) 
VALUES 
('Big Mac', 'Hamburguesa doble con salsa especial', 5.99, 1, 9, 'Hamburguesas'),
('Cuarto de Libra', 'Hamburguesa con queso', 4.99, 1, 9, 'Hamburguesas'),
('McNuggets (10 pzas)', 'Nuggets de pollo', 4.49, 1, 9, 'Acompañamientos'),
('Papas Fritas Grandes', 'Porción grande de papas fritas', 2.99, 1, 9, 'Acompañamientos'),
('McFlurry Oreo', 'Helado con galletas Oreo', 3.49, 1, 9, 'Postres');

-- Subway
INSERT INTO Producto (Nombre, Descripcion, Precio, Disponible, RestauranteId, Categoria) 
VALUES 
('Sub de Pollo Teriyaki', 'Pan integral con pollo teriyaki y vegetales', 6.49, 1, 10, 'Sándwiches'),
('Sub Italiano BMT', 'Variedad de embutidos italianos', 7.49, 1, 10, 'Sándwiches'),
('Sub Vegetariano', 'Con todos los vegetales disponibles', 5.99, 1, 10, 'Sándwiches'),
('Galletas (3 pzas)', 'Galletas de chocolate, avena o chispas', 2.49, 1, 10, 'Postres'),
('Refresco Mediano', 'Refresco con refill gratis', 1.99, 1, 10, 'Bebidas');

-- Starbucks
INSERT INTO Producto (Nombre, Descripcion, Precio, Disponible, RestauranteId, Categoria) 
VALUES 
('Café Latte Grande', 'Café latte 16 oz', 4.25, 1, 11, 'Café Caliente'),
('Caramel Macchiato Venti', 'Café con caramelo 20 oz', 5.75, 1, 11, 'Café Caliente'),
('Frappuccino Mocha', 'Bebida fría de café y chocolate', 5.25, 1, 11, 'Café Frío'),
('Muffin de Arándanos', 'Muffin casero con arándanos', 3.25, 1, 11, 'Panadería'),
('Sándwich de Pavo', 'Sándwich caliente de pavo y queso', 6.50, 1, 11, 'Comida');

-- Comida Típica
INSERT INTO Producto (Nombre, Descripcion, Precio, Disponible, RestauranteId, Categoria) 
VALUES 
('Pupusas Revueltas (3 pzas)', 'Pupusas de queso, chicharrón y frijol', 3.50, 1, 12, 'Platos Típicos'),
('Pupusas de Queso (3 pzas)', 'Pupusas de queso con curtido', 3.00, 1, 12, 'Platos Típicos'),
('Sopa de Pata', 'Sopa tradicional salvadoreña', 6.50, 1, 12, 'Sopas'),
('Tamales de Pollo (2 pzas)', 'Tamales de elote con pollo', 4.00, 1, 12, 'Platos Típicos'),
('Horchata Jarra', 'Bebida tradicional de arroz', 3.00, 1, 12, 'Bebidas');

-- Insertar órdenes de prueba en varios estados
-- Orden 1: CREADA (sin repartidor aún)
INSERT INTO Orden (ClienteId, RestauranteId, Estado, DireccionEntrega, LatitudEntrega, LongitudEntrega, CostoTotal)
VALUES (2, 8, 'CREADA', 'Residencial Las Magnolias, Casa #15', 13.6945, -89.2201, 25.97);

-- Orden 2: ACEPTADA (restaurante aceptó)
INSERT INTO Orden (ClienteId, RestauranteId, Estado, DireccionEntrega, LatitudEntrega, LongitudEntrega, CostoTotal)
VALUES (2, 9, 'ACEPTADA', 'Colonia San Benito, Edificio A, Apt 302', 13.6889, -89.2450, 14.47);

-- Orden 3: EN_PREPARACION
INSERT INTO Orden (ClienteId, RestauranteId, Estado, DireccionEntrega, LatitudEntrega, LongitudEntrega, CostoTotal)
VALUES (3, 10, 'EN_PREPARACION', 'Colonia Escalón, Calle Las Camelias #123', 13.7012, -89.2387, 9.48);

-- Orden 4: LISTA (esperando repartidor)
INSERT INTO Orden (ClienteId, RestauranteId, Estado, DireccionEntrega, LatitudEntrega, LongitudEntrega, CostoTotal, RepartidorId)
VALUES (3, 11, 'LISTA', 'Multiplaza, Oficina 405', 13.6725, -89.2412, 11.00, 5);

-- Orden 5: EN_CAMINO (repartidor en camino)
INSERT INTO Orden (ClienteId, RestauranteId, Estado, DireccionEntrega, LatitudEntrega, LongitudEntrega, CostoTotal, RepartidorId)
VALUES (4, 12, 'EN_CAMINO', 'Colonia Flor Blanca, Casa #78', 13.6901, -89.2428, 10.50, 6);

-- Orden 6: ENTREGADA (completada)
INSERT INTO Orden (ClienteId, RestauranteId, Estado, DireccionEntrega, LatitudEntrega, LongitudEntrega, CostoTotal, RepartidorId)
VALUES (4, 8, 'ENTREGADA', 'Colonia San Francisco, Calle Principal #45', 13.6950, -89.2198, 18.98, 7);

-- Orden 7: CANCELADA (por cliente)
INSERT INTO Orden (ClienteId, RestauranteId, Estado, DireccionEntrega, LatitudEntrega, LongitudEntrega, CostoTotal)
VALUES (2, 10, 'CANCELADA', 'Residencial Las Margaritas, Casa #22', 13.7034, -89.2391, 12.97);

-- Orden 8: RECHAZADA (por restaurante)
INSERT INTO Orden (ClienteId, RestauranteId, Estado, DireccionEntrega, LatitudEntrega, LongitudEntrega, CostoTotal)
VALUES (3, 9, 'RECHAZADA', 'Colonia Miramonte, Edificio B, Apt 101', 13.6876, -89.2463, 8.98);

-- Insertar productos en las órdenes
-- Orden 1 (Pizza Hut)
INSERT INTO ProductoOrden (OrdenId, ProductoId, Cantidad, PrecioUnitario, Comentarios)
VALUES 
(1, 1, 1, 12.99, 'Sin aceitunas'),
(1, 5, 1, 2.99, 'Refresco de limón');

-- Orden 2 (McDonalds)
INSERT INTO ProductoOrden (OrdenId, ProductoId, Cantidad, PrecioUnitario, Comentarios)
VALUES 
(2, 6, 2, 5.99, 'Extra salsa'),
(2, 9, 1, 2.99, 'Sin sal');

-- Orden 3 (Subway)
INSERT INTO ProductoOrden (OrdenId, ProductoId, Cantidad, PrecioUnitario)
VALUES 
(3, 11, 1, 6.49),
(3, 15, 1, 1.99);

-- Orden 4 (Starbucks)
INSERT INTO ProductoOrden (OrdenId, ProductoId, Cantidad, PrecioUnitario, Comentarios)
VALUES 
(4, 16, 1, 4.25, 'Extra caliente'),
(4, 19, 1, 3.25, 'Para llevar');

-- Orden 5 (Comida Típica)
INSERT INTO ProductoOrden (OrdenId, ProductoId, Cantidad, PrecioUnitario)
VALUES 
(5, 21, 2, 3.50),
(5, 25, 1, 3.00);

-- Orden 6 (Pizza Hut - entregada)
INSERT INTO ProductoOrden (OrdenId, ProductoId, Cantidad, PrecioUnitario)
VALUES 
(6, 2, 1, 15.99),
(6, 3, 1, 2.99);

-- Orden 7 (Subway - cancelada)
INSERT INTO ProductoOrden (OrdenId, ProductoId, Cantidad, PrecioUnitario)
VALUES 
(7, 12, 1, 7.49),
(7, 14, 1, 2.49),
(7, 15, 1, 1.99);

-- Orden 8 (McDonalds - rechazada)
INSERT INTO ProductoOrden (OrdenId, ProductoId, Cantidad, PrecioUnitario, Comentarios)
VALUES 
(8, 8, 1, 4.49, 'Salsa BBQ extra'),
(8, 10, 1, 3.49, 'Para llevar');

-- Insertar registros en OrdenCancelada para las órdenes canceladas
-- Orden 7 cancelada por cliente
INSERT INTO OrdenCancelada (OrdenId, CanceladoPor, Motivo, FechaCancelacion)
VALUES (7, 2, 'Cambié de opinión, ya no quiero comer', DATEADD(HOUR, -1, GETDATE()));

-- Orden 8 rechazada por restaurante (puedes agregarla como cancelada también)
INSERT INTO OrdenCancelada (OrdenId, CanceladoPor, Motivo, FechaCancelacion)
VALUES (8, 9, 'Producto agotado, no hay McNuggets', DATEADD(HOUR, -2, GETDATE()));