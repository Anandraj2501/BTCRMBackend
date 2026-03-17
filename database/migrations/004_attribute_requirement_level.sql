-- Migration 004: Add requirementlevel to AttributeMetadata
-- Values: 'None' | 'Recommended' | 'Required' | 'BusinessRequired'
USE MiniCRM;
GO

IF NOT EXISTS (
    SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'AttributeMetadata' AND COLUMN_NAME = 'requirementlevel'
)
BEGIN
    ALTER TABLE AttributeMetadata 
    ADD requirementlevel NVARCHAR(20) NOT NULL DEFAULT 'None';
    PRINT 'Added requirementlevel to AttributeMetadata.';
END
ELSE
    PRINT 'requirementlevel already exists, skipped.';
GO

PRINT 'Migration 004 complete.';
