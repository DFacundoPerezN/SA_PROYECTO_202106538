USE DATABASE Delivereats_SA_Productos;
GO
CREATE TABLE Promocion (
    Id            INT IDENTITY PRIMARY KEY,
    RestauranteId INT           NOT NULL,
    Titulo        NVARCHAR(100) NOT NULL,   -- "20% en todo el menú"
    Descripcion   NVARCHAR(255) NULL,
    Tipo          NVARCHAR(32)  NOT NULL,   -- 'PORCENTAJE' | 'ENVIO_GRATIS' | 'MONTO_FIJO'
    Valor         DECIMAL(10,2) NOT NULL DEFAULT 0,
    FechaInicio   DATETIME      NOT NULL,
    FechaFin      DATETIME      NOT NULL,
    Activa        BIT           NOT NULL DEFAULT 1
)


USE DATABASE Delivereats_SA_Pagos;
GO

CREATE TABLE Cupon (
    Id              INT IDENTITY PRIMARY KEY,
    RestauranteId   INT           NOT NULL,
    Codigo          NVARCHAR(32)  NOT NULL UNIQUE,  -- "DESC20"
    Tipo            NVARCHAR(32)  NOT NULL,          -- 'PORCENTAJE' | 'MONTO_FIJO'
    Valor           DECIMAL(10,2) NOT NULL,
    UsoMaximo       INT           NOT NULL DEFAULT 1,
    UsoActual       INT           NOT NULL DEFAULT 0,
    FechaInicio     DATETIME      NOT NULL,
    FechaExpiracion DATETIME      NOT NULL,
    Autorizado      BIT           NOT NULL DEFAULT 0,
    AutorizadoPor   INT           NULL,
    Activo          BIT           NOT NULL DEFAULT 1
)