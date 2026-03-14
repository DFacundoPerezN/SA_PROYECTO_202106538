-- Agregar tabla Promocion para gestionar promociones de restaurantes

USE DATABASE Delivereats_SA_Restaurantes;
GO
CREATE TABLE Promocion (
    Id            INT IDENTITY PRIMARY KEY,
    RestauranteId INT           NOT NULL,
    Titulo        NVARCHAR(100) NOT NULL,
    Descripcion   NVARCHAR(255) NULL,
    Tipo          NVARCHAR(32)  NOT NULL CHECK (Tipo IN ('PORCENTAJE', 'ENVIO_GRATIS')),
    Valor         DECIMAL(10,2) NOT NULL DEFAULT 0,
    FechaInicio   DATETIME      DEFAULT GETDATE(),
    FechaFin      DATETIME      NOT NULL,
    Activa        BIT           NOT NULL DEFAULT 1,
    
    -- Constraints
    CONSTRAINT FK_Promocion_Restaurante FOREIGN KEY (RestauranteId) 
        REFERENCES Restaurante(Id)
        ON DELETE CASCADE,

    CONSTRAINT CHK_Promocion_Fechas CHECK (FechaFin >= FechaInicio),
    CONSTRAINT CHK_Promocion_Valor CHECK (Valor >= 0)
);
GO

-- 1. Para búsquedas por restaurante y fechas con promociones activas.
CREATE INDEX IX_Promocion_Restaurante_Fechas 
ON Promocion(RestauranteId, FechaInicio, FechaFin, Activa);
GO

-- 2. Para filtrar solo promociones activas (rendimiento en consultas frecuentes)
CREATE INDEX IX_Promocion_Activa_Fechas 
ON Promocion(Activa, FechaInicio, FechaFin) 
INCLUDE (Titulo, Tipo, Valor);
GO

-- 3. Buscar promociones por tipo específico
CREATE INDEX IX_Promocion_Tipo 
ON Promocion(Tipo) 
WHERE Tipo = 'PORCENTAJE'; 
GO

-- Agregar tabla Cupon a la base de datos Delivereats_SA_Restaurantes para gestionar cupones de descuento

CREATE TABLE Cupon (
    Id              INT IDENTITY PRIMARY KEY,
    RestauranteId   INT           NOT NULL,
    Codigo          NVARCHAR(32)  NOT NULL,
    Titulo          NVARCHAR(100) NOT NULL,  -- Añadido para consistencia
    Descripcion     NVARCHAR(255) NULL,      -- Añadido para consistencia
    Valor           DECIMAL(10,2) NOT NULL DEFAULT 0, -- será un porcentaje o un monto fijo dependiendo del tipo
    UsoMaximo       INT           NOT NULL DEFAULT 1,
    UsosActuales    INT           NOT NULL DEFAULT 0,  -- Añadido para trackear usos
    FechaInicio     DATETIME      DEFAULT GETDATE(),
    FechaExpiracion DATETIME      NOT NULL,
    Autorizado      BIT           NOT NULL DEFAULT 0,
    Activo          BIT           NOT NULL DEFAULT 1,
    
    -- Constraints
    CONSTRAINT FK_Cupon_Restaurante FOREIGN KEY (RestauranteId) 
        REFERENCES Restaurante(Id)
        ON DELETE CASCADE,
    
    CONSTRAINT UQ_Cupon_Codigo_Restaurante UNIQUE (RestauranteId, Codigo), -- Cambiado de UNIQUE simple a compuesto por restaurante
    
    CONSTRAINT CHK_Cupon_Fechas CHECK (FechaExpiracion >= FechaInicio),
    CONSTRAINT CHK_Cupon_Valor CHECK (Valor >= 0),
    CONSTRAINT CHK_Cupon_Usos CHECK (UsosActuales <= UsoMaximo),
);
GO

-- 1. Índice para búsquedas por restaurante y fechas (activos y vigentes)
CREATE INDEX IX_Cupon_Restaurante_Fechas 
ON Cupon(RestauranteId, FechaInicio, FechaExpiracion, Activo)
WHERE Activo = 1;
GO

-- 2. Índice para validación rápida de códigos (usado al aplicar cupón)
CREATE INDEX IX_Cupon_Codigo_Restaurante 
ON Cupon(RestauranteId, Codigo) 
INCLUDE (Activo, Autorizado, Valor, UsoMaximo, UsosActuales, FechaInicio, FechaExpiracion);
GO

-- 3. Índice para cupones por vencer/próximos a vencer (tareas de mantenimiento)
CREATE INDEX IX_Cupon_Expiracion 
ON Cupon(FechaExpiracion) 
INCLUDE (RestauranteId, Codigo, Activo, Autorizado)
WHERE Activo = 1;
GO

-- 4. Índice para filtrar cupones autorizados pendientes de activación
CREATE INDEX IX_Cupon_Autorizado_Activo 
ON Cupon(Autorizado, Activo, FechaInicio)
WHERE Autorizado = 1 AND Activo = 1;
GO
