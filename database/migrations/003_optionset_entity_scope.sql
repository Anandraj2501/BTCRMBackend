-- Migration 003: Add entitylogicalname to OptionSetMetadata
USE MiniCRM;
GO

-- Add entitylogicalname column to allow entity-scoped option sets
IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='OptionSetMetadata' AND COLUMN_NAME='entitylogicalname')
BEGIN
    ALTER TABLE OptionSetMetadata ADD entitylogicalname NVARCHAR(200) NULL;
    PRINT 'Added entitylogicalname to OptionSetMetadata.';
END
ELSE
    PRINT 'entitylogicalname already exists on OptionSetMetadata, skipped.';
GO

PRINT 'Migration 003 complete.';
