CREATE TABLE Usuario (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Email NVARCHAR(64) UNIQUE NOT NULL,
    PasswordHash NVARCHAR(127) NOT NULL,
    Rol NVARCHAR(16) NOT NULL CHECK (Rol IN ('CLIENTE', 'RESTAURANTE', 'REPARTIDOR', 'ADMINISTRADOR')),
    NombreCompleto NVARCHAR(200) NOT NULL,
    Telefono NVARCHAR(20),
    FechaRegistro DATETIME DEFAULT GETDATE()
);

-- RESTURATNES DATABASE
CREATE TABLE Restaurante (
    Id INT PRIMARY KEY, -- Id del usuario que es el restaurante
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

-- PRODUCTOS DATABASE
CREATE TABLE Producto (
    Id INT PRIMARY KEY IDENTITY(1,1),
    Nombre NVARCHAR(64) NOT NULL,
    Descripcion NVARCHAR(255),
    Precio DECIMAL(10,2) NOT NULL CHECK (Precio >= 0),

    RestauranteId INT NOT NULL, 
    RestauranteNombre NVARCHAR(64),
    
    Disponible BIT DEFAULT 1,
    Categoria NVARCHAR(32),
    FechaCreacion DATETIME DEFAULT GETDATE()
);

-- ORDENES DATABASE
CREATE TABLE Orden (
    Id INT PRIMARY KEY IDENTITY(1,1),

    ClienteId INT NOT NULL,
    ClienteNombre NVARCHAR(120),
    ClienteTelefono NVARCHAR(32),

    RestauranteId INT NOT NULL,
    RestauranteNombre NVARCHAR(120),

    RepartidorId INT,

    Estado NVARCHAR(16) NOT NULL DEFAULT 'CREADA'
        CHECK (Estado IN (
            'CREADA',
            'ACEPTADA',
            'EN_PREPARACION',
            'TERMINADA',
            'EN_CAMINO',
            'ENTREGADA',
            'CANCELADA',
            'RECHAZADA'
        )),

    DireccionEntrega NVARCHAR(200) NOT NULL,
    LatitudEntrega DECIMAL(10,8),
    LongitudEntrega DECIMAL(11,8),

    CostoTotal DECIMAL(10,2),

    FechaHoraCreacion DATETIME DEFAULT GETDATE()
);

-- Tabla para almacenar los productos de cada orden
CREATE TABLE ProductoOrden (
    Id INT PRIMARY KEY IDENTITY(1,1),
    OrdenId INT NOT NULL, 

    ProductoId INT NOT NULL, 
    NombreProducto NVARCHAR(64) NOT NULL,
    PrecioUnitario DECIMAL(10,2) NOT NULL, -- Precio al momento de la orden
    
    Cantidad INT NOT NULL CHECK (Cantidad > 0),
    Subtotal AS (Cantidad * PrecioUnitario) PERSISTED,
    Comentarios NVARCHAR(200)
);

CREATE TABLE OrdenCancelada (
    Id INT PRIMARY KEY IDENTITY(1,1),
    OrdenId INT NOT NULL, -- FOREIGN KEY REFERENCES Orden(Id)
    CanceladoPor INT NOT NULL, -- FOREIGN KEY REFERENCES Usuario(Id)
    Motivo NVARCHAR(500),
    FechaCancelacion DATETIME DEFAULT GETDATE(),
    INDEX IX_OrdenCancelada_Orden (OrdenId)
);

-- Índices adicionales para optimización

-- Producto (búsquedas)
--CREATE INDEX IX_Producto_Nombre ON Producto(Nombre) WHERE Disponible = 1;

-- Orden (consultas frecuentes)
--CREATE INDEX IX_Orden_Fecha ON Orden(FechaHoraCreacion DESC);