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

-- Agregar tabla Cupon a la base de datos Delivereats_SA_Pagos para gestionar cupones de descuento

USE DATABASE Delivereats_SA_Pagos;
GO

CREATE TABLE Cupon (
    Id              INT IDENTITY PRIMARY KEY,
    RestauranteId   INT           NOT NULL,
    Codigo          NVARCHAR(32)  NOT NULL UNIQUE,  -- "DESC20"
    Tipo            NVARCHAR(32)  NOT NULL,          -- 'PORCENTAJE'
    Valor           DECIMAL(10,2) NOT NULL,
    UsoMaximo       INT           NOT NULL DEFAULT 1,
    UsoActual       INT           NOT NULL DEFAULT 0,
    FechaInicio     DATETIME      NOT NULL,
    FechaExpiracion DATETIME      NOT NULL,
    Autorizado      BIT           NOT NULL DEFAULT 0,
    AutorizadoPor   INT           NULL,
    Activo          BIT           NOT NULL DEFAULT 1
)