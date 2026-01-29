-- Listado de usuarios con sus roles
SELECT Id, Email, Rol, NombreCompleto, Telefono 
FROM Usuario 
ORDER BY Rol, NombreCompleto;

--- Restaurantes activos
SELECT r.Nombre, r.Direccion, r.Telefono, COUNT(p.Id) as ProductosDisponibles
FROM Restaurante r
LEFT JOIN Producto p ON r.Id = p.RestauranteId AND p.Disponible = 1
WHERE r.Activo = 1
GROUP BY r.Id, r.Nombre, r.Direccion, r.Telefono
ORDER BY r.Nombre;

-- ver ordenes por restaurante y estado
SELECT 
    o.Id as OrdenId,
    u.NombreCompleto as Cliente,
    o.Estado,
    o.FechaHoraCreacion,
    o.CostoTotal,
    o.DireccionEntrega
FROM Orden o
JOIN Usuario u ON o.ClienteId = u.Id
WHERE o.RestauranteId = 8  -- Pizza Hut
ORDER BY 
    CASE o.Estado 
        WHEN 'CREADA' THEN 1
        WHEN 'ACEPTADA' THEN 2
        WHEN 'EN_PREPARACION' THEN 3
        WHEN 'LISTA' THEN 4
        WHEN 'EN_CAMINO' THEN 5
        ELSE 6
    END,
    o.FechaHoraCreacion DESC;

-- Orden específica
SELECT 
    o.Id as OrdenId,
    r.Nombre as Restaurante,
    c.NombreCompleto as Cliente,
    rep.NombreCompleto as Repartidor,
    o.Estado,
    o.FechaHoraCreacion,
    o.DireccionEntrega,
    o.CostoTotal,
    p.Nombre as Producto,
    po.Cantidad,
    po.PrecioUnitario,
    po.Subtotal,
    po.Comentarios as Especificaciones
FROM Orden o
JOIN Restaurante r ON o.RestauranteId = r.Id
JOIN Usuario c ON o.ClienteId = c.Id
LEFT JOIN Usuario rep ON o.RepartidorId = rep.Id
JOIN ProductoOrden po ON o.Id = po.OrdenId
JOIN Producto p ON po.ProductoId = p.Id
WHERE o.Id = 1;  -- Cambia el ID según necesites

-- Ordenes para repartidores
SELECT 
    o.Id as OrdenId,
    r.Nombre as Restaurante,
    r.Direccion as DireccionRestaurante,
    o.DireccionEntrega,
    o.CostoTotal,
    TIMEDIFF(MINUTE, o.FechaHoraCreacion, GETDATE()) as MinutosEsperando
FROM Orden o
JOIN Restaurante r ON o.RestauranteId = r.Id
WHERE o.Estado = 'LISTA'  -- Órdenes listas para recoger
AND o.RepartidorId IS NULL  -- Sin repartidor asignado
ORDER BY o.FechaHoraCreacion ASC;

-- Historial de órdenes por cliente
SELECT 
    o.Id as OrdenId,
    r.Nombre as Restaurante,
    o.Estado,
    o.FechaHoraCreacion,
    o.CostoTotal,
    STRING_AGG(p.Nombre + ' x' + CAST(po.Cantidad as NVARCHAR), ', ') as Productos
FROM Orden o
JOIN Restaurante r ON o.RestauranteId = r.Id
JOIN ProductoOrden po ON o.Id = po.OrdenId
JOIN Producto p ON po.ProductoId = p.Id
WHERE o.ClienteId = 2  -- Ana Martínez
GROUP BY o.Id, r.Nombre, o.Estado, o.FechaHoraCreacion, o.CostoTotal
ORDER BY o.FechaHoraCreacion DESC;

-- Cancelaciones
SELECT 
    oc.OrdenId,
    u_canc.NombreCompleto as CanceladoPor,
    oc.Motivo,
    oc.FechaCancelacion,
    o.Estado,
    r.Nombre as Restaurante,
    c.NombreCompleto as Cliente
FROM OrdenCancelada oc
JOIN Orden o ON oc.OrdenId = o.Id
JOIN Usuario u_canc ON oc.CanceladoPor = u_canc.Id
JOIN Restaurante r ON o.RestauranteId = r.Id
JOIN Usuario c ON o.ClienteId = c.Id
ORDER BY oc.FechaCancelacion DESC;

--Cambiar estado de una orden
-- Restaurante acepta orden
UPDATE Orden 
SET Estado = 'ACEPTADA' 
WHERE Id = 1 AND Estado = 'CREADA';

-- Asignar repartidor
UPDATE Orden 
SET RepartidorId = 5, Estado = 'EN_CAMINO' 
WHERE Id = 4 AND Estado = 'LISTA';

-- Marcar como entregada
UPDATE Orden 
SET Estado = 'ENTREGADA' 
WHERE Id = 5 AND Estado = 'EN_CAMINO';

-- Productos veniddos por restaurante
SELECT 
    r.Nombre as Restaurante,
    p.Nombre as Producto,
    SUM(po.Cantidad) as TotalVendido,
    SUM(po.Subtotal) as IngresosGenerados
FROM ProductoOrden po
JOIN Producto p ON po.ProductoId = p.Id
JOIN Restaurante r ON p.RestauranteId = r.Id
JOIN Orden o ON po.OrdenId = o.Id
WHERE o.Estado NOT IN ('CANCELADA', 'RECHAZADA')
GROUP BY r.Nombre, p.Nombre, p.Id
ORDER BY r.Nombre, TotalVendido DESC;