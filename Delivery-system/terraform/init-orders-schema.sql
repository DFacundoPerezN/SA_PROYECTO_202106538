USE [Delivereats_SA_Ordenes];
GO

SET QUOTED_IDENTIFIER ON;
GO

SET ANSI_NULLS ON;
GO

IF OBJECT_ID(N'dbo.Orden', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Orden (
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
END
GO

IF OBJECT_ID(N'dbo.ProductoOrden', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ProductoOrden (
        Id INT PRIMARY KEY IDENTITY(1,1),
        OrdenId INT NOT NULL,

        ProductoId INT NOT NULL,
        NombreProducto NVARCHAR(64) NOT NULL,
        PrecioUnitario DECIMAL(10,2) NOT NULL,

        Cantidad INT NOT NULL CHECK (Cantidad > 0),
        Subtotal AS (Cantidad * PrecioUnitario) PERSISTED,
        Comentarios NVARCHAR(200)
    );
END
GO

IF OBJECT_ID(N'dbo.OrdenCancelada', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OrdenCancelada (
        Id INT PRIMARY KEY IDENTITY(1,1),
        OrdenId INT NOT NULL,
        CanceladoPor INT NOT NULL,
        Motivo NVARCHAR(500),
        FechaCancelacion DATETIME DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = N'IX_OrdenCancelada_Orden'
      AND object_id = OBJECT_ID(N'dbo.OrdenCancelada')
)
BEGIN
    CREATE INDEX IX_OrdenCancelada_Orden ON dbo.OrdenCancelada (OrdenId);
END
GO

IF OBJECT_ID(N'dbo.ImagenOrden', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ImagenOrden (
        OrdenId INT NOT NULL,
        Link NVARCHAR(512)
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE [name] = N'UQ_ImagenOrden_OrdenId'
      AND parent_object_id = OBJECT_ID(N'dbo.ImagenOrden')
)
BEGIN
    ALTER TABLE dbo.ImagenOrden
    ADD CONSTRAINT UQ_ImagenOrden_OrdenId UNIQUE (OrdenId);
END
GO