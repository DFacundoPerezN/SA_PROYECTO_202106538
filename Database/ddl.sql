CREATE TABLE Usuario (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Email NVARCHAR(64) UNIQUE NOT NULL,
    PasswordHash NVARCHAR(127) NOT NULL,
    Rol NVARCHAR(16) NOT NULL CHECK (Rol IN ('CLIENTE', 'RESTAURANTE', 'REPARTIDOR', 'ADMINISTRADOR')),
    NombreCompleto NVARCHAR(200) NOT NULL,
    Telefono NVARCHAR(20),
    FechaRegistro DATETIME DEFAULT GETDATE()
);


CREATE TABLE Restaurante (
    Id INT PRIMARY KEY FOREIGN KEY REFERENCES Usuario(Id),
    Nombre NVARCHAR(64) NOT NULL,
    Direccion NVARCHAR(200) NOT NULL,
    Latitud DECIMAL(10,8),
    Longitud DECIMAL(11,8),
    HorarioApertura TIME,
    HorarioCierre TIME,
    Telefono NVARCHAR(20),
    CalificacionPromedio DECIMAL(3,2) DEFAULT 0,
    Activo BIT DEFAULT 1
);

CREATE TABLE Producto (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(64) NOT NULL,
    Descripcion NVARCHAR(255),
    Precio DECIMAL(10,2) NOT NULL CHECK (Precio >= 0),
    Disponible BIT DEFAULT 1,
    RestauranteId INT NOT NULL FOREIGN KEY REFERENCES Restaurante(Id),
    Categoria NVARCHAR(32),
    --ImagenUrl NVARCHAR(500),
    --TiempoPreparacionEstimado INT, -- en minutos
    FechaCreacion DATETIME DEFAULT GETDATE(),
    INDEX IX_Producto_Restaurante (RestauranteId)
);

CREATE TABLE Orden (
    Id INT PRIMARY KEY IDENTITY(1,1),
    ClienteId INT NOT NULL FOREIGN KEY REFERENCES Usuario(Id),
    RestauranteId INT NOT NULL FOREIGN KEY REFERENCES Restaurante(Id),
    RepartidorId INT FOREIGN KEY REFERENCES Usuario(Id),
    Estado NVARCHAR(16) NOT NULL DEFAULT 'CREADA' 
        CHECK (Estado IN ('CREADA', 'PENDIENTE', 'ACEPTADA', 'EN_PREPARACION', 
                         'LISTA', 'EN_CAMINO', 'ENTREGADA', 'CANCELADA', 'RECHAZADA')),
    FechaHoraCreacion DATETIME DEFAULT GETDATE(),
    --FechaHoraEntrega DATETIME,
    DireccionEntrega NVARCHAR(200) NOT NULL,
    LatitudEntrega DECIMAL(10,8),
    LongitudEntrega DECIMAL(11,8),
    --MetodoPago NVARCHAR(32),
    --Subtotal DECIMAL(10,2),
    --CostoEnvio DECIMAL(10,2),
    --Impuestos DECIMAL(10,2),
    CostoTotal DECIMAL(10,2),
    INDEX IX_Orden_Cliente (ClienteId),
    INDEX IX_Orden_Restaurante (RestauranteId),
    INDEX IX_Orden_Repartidor (RepartidorId),
    INDEX IX_Orden_Estado (Estado)
);

CREATE TABLE ProductoOrden (
    Id INT PRIMARY KEY IDENTITY(1,1),
    OrdenId INT NOT NULL FOREIGN KEY REFERENCES Orden(Id),
    ProductoId INT NOT NULL FOREIGN KEY REFERENCES Producto(Id),
    Cantidad INT NOT NULL CHECK (Cantidad > 0),
    PrecioUnitario DECIMAL(10,2) NOT NULL, -- Precio al momento de la orden
    Subtotal AS (Cantidad * PrecioUnitario) PERSISTED,
    Comentarios NVARCHAR(200),
    INDEX IX_ProductoOrden_Orden (OrdenId),
    INDEX IX_ProductoOrden_Producto (ProductoId)
);

CREATE TABLE OrdenCancelada (
    Id INT PRIMARY KEY IDENTITY(1,1),
    OrdenId INT NOT NULL FOREIGN KEY REFERENCES Orden(Id),
    CanceladoPor INT NOT NULL FOREIGN KEY REFERENCES Usuario(Id),
    Motivo NVARCHAR(500),
    FechaCancelacion DATETIME DEFAULT GETDATE(),
    INDEX IX_OrdenCancelada_Orden (OrdenId)
);

-- Índices adicionales para optimización

-- Producto (búsquedas)
CREATE INDEX IX_Producto_Nombre ON Producto(Nombre) WHERE Disponible = 1;

-- Orden (consultas frecuentes)
CREATE INDEX IX_Orden_Fecha ON Orden(FechaHoraCreacion DESC);