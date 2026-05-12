-- 009_advanced_views.sql
-- Enhance ViewMetadata to support Dynamics 365 style views

-- Add new columns if they don't exist
IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ViewMetadata') AND name = 'viewtype')
BEGIN
    ALTER TABLE ViewMetadata ADD viewtype NVARCHAR(50) DEFAULT 'System';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ViewMetadata') AND name = 'ismanaged')
BEGIN
    ALTER TABLE ViewMetadata ADD ismanaged BIT DEFAULT 0;
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ViewMetadata') AND name = 'iscustomizable')
BEGIN
    ALTER TABLE ViewMetadata ADD iscustomizable BIT DEFAULT 1;
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ViewMetadata') AND name = 'status')
BEGIN
    ALTER TABLE ViewMetadata ADD status NVARCHAR(20) DEFAULT 'Active';
END

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ViewMetadata') AND name = 'modifiedon')
BEGIN
    ALTER TABLE ViewMetadata ADD modifiedon DATETIME DEFAULT GETDATE();
END

GO

-- Ensure every entity has default views if they don't exist
-- This part is usually handled by the repository/service on entity creation, 
-- but we can seed existing entities here if needed.
