-- =============================================
-- Migration 001: Add Relationship, Form, View Metadata Tables
-- =============================================

USE MiniCRM;
GO

-- 1. RelationshipMetadata
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'RelationshipMetadata')
BEGIN
    CREATE TABLE RelationshipMetadata (
        relationshipid      UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        relationshipname    NVARCHAR(255) NOT NULL,
        relationshiptype    NVARCHAR(10) NOT NULL,  -- '1:N', 'N:1', 'N:N'
        primaryentityid     UNIQUEIDENTIFIER NOT NULL REFERENCES EntityMetadata(entityid),
        relatedentityid     UNIQUEIDENTIFIER NOT NULL REFERENCES EntityMetadata(entityid),
        cascadebehavior     NVARCHAR(50) DEFAULT 'None',
        createdon           DATETIME DEFAULT GETDATE()
    );
    PRINT 'Created RelationshipMetadata table.';
END
ELSE
    PRINT 'RelationshipMetadata already exists, skipped.';
GO

-- 2. FormMetadata
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'FormMetadata')
BEGIN
    CREATE TABLE FormMetadata (
        formid          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        entityid        UNIQUEIDENTIFIER NOT NULL REFERENCES EntityMetadata(entityid),
        formname        NVARCHAR(255) NOT NULL,
        isdefault       BIT DEFAULT 0,
        definitionjson  NVARCHAR(MAX) NOT NULL,
        createdon       DATETIME DEFAULT GETDATE()
    );
    PRINT 'Created FormMetadata table.';
END
ELSE
    PRINT 'FormMetadata already exists, skipped.';
GO

-- 3. ViewMetadata
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ViewMetadata')
BEGIN
    CREATE TABLE ViewMetadata (
        viewid          UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),
        entityid        UNIQUEIDENTIFIER NOT NULL REFERENCES EntityMetadata(entityid),
        viewname        NVARCHAR(255) NOT NULL,
        isdefault       BIT DEFAULT 0,
        definitionjson  NVARCHAR(MAX) NOT NULL,
        createdon       DATETIME DEFAULT GETDATE()
    );
    PRINT 'Created ViewMetadata table.';
END
ELSE
    PRINT 'ViewMetadata already exists, skipped.';
GO

PRINT 'Migration 001 complete.';
