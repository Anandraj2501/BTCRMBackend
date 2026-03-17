-- =============================================
-- Migration 002: Option Sets + Status Fields
-- =============================================
USE MiniCRM;
GO

-- 1. OptionSetMetadata table
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'OptionSetMetadata')
BEGIN
    CREATE TABLE OptionSetMetadata (
        optionsetid    UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        name           NVARCHAR(200) NOT NULL,
        displayname    NVARCHAR(200) NOT NULL,
        isglobal       BIT DEFAULT 0,
        optionsjson    NVARCHAR(MAX) NOT NULL,  -- JSON: [{"label":"Low","value":1},...]
        createdon      DATETIME DEFAULT GETDATE()
    );
    PRINT 'Created OptionSetMetadata table.';
END
ELSE
    PRINT 'OptionSetMetadata already exists, skipped.';
GO

-- 2. Add optionsetid FK to AttributeMetadata (nullable)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AttributeMetadata' AND COLUMN_NAME='optionsetid')
BEGIN
    ALTER TABLE AttributeMetadata ADD optionsetid UNIQUEIDENTIFIER NULL
        REFERENCES OptionSetMetadata(optionsetid);
    PRINT 'Added optionsetid to AttributeMetadata.';
END
ELSE
    PRINT 'optionsetid column already exists on AttributeMetadata, skipped.';
GO

-- 3. Add targetentity column to AttributeMetadata for Lookup types (if missing)
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='AttributeMetadata' AND COLUMN_NAME='targetentity')
BEGIN
    ALTER TABLE AttributeMetadata ADD targetentity NVARCHAR(100) NULL;
    PRINT 'Added targetentity to AttributeMetadata.';
END
ELSE
    PRINT 'targetentity column already exists on AttributeMetadata, skipped.';
GO

-- 4. Seed Priority global option set
IF NOT EXISTS (SELECT 1 FROM OptionSetMetadata WHERE name = 'priority')
BEGIN
    INSERT INTO OptionSetMetadata (name, displayname, isglobal, optionsjson)
    VALUES (
        'priority', 'Priority', 1,
        '[{"label":"Low","value":1},{"label":"Medium","value":2},{"label":"High","value":3}]'
    );
    PRINT 'Seeded Priority option set.';
END
GO

-- 5. Seed Status global option set
IF NOT EXISTS (SELECT 1 FROM OptionSetMetadata WHERE name = 'statecode')
BEGIN
    INSERT INTO OptionSetMetadata (name, displayname, isglobal, optionsjson)
    VALUES (
        'statecode', 'State', 1,
        '[{"label":"Active","value":0},{"label":"Inactive","value":1}]'
    );
    PRINT 'Seeded State option set.';
END
GO

PRINT 'Migration 002 complete.';
