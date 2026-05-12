USE MiniCRM;
GO

-- Add appid column to BaseEntity for per-app record isolation.
-- Records without an appid (legacy/pre-migration rows) remain globally visible
-- and are treated as belonging to no specific app.
IF COL_LENGTH('BaseEntity', 'appid') IS NULL
BEGIN
    ALTER TABLE BaseEntity ADD appid UNIQUEIDENTIFIER NULL;
END
GO

-- Index for efficient per-app + entity queries
IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE name = 'IX_BaseEntity_appid_logicalname'
      AND object_id = OBJECT_ID('BaseEntity')
)
BEGIN
    CREATE NONCLUSTERED INDEX IX_BaseEntity_appid_logicalname
        ON BaseEntity (appid, logicalname)
        WHERE statecode = 0;
END
GO
