-- 008_personal_views.sql
-- Add support for personal views and view ownership

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('ViewMetadata') AND name = 'viewtype'
)
BEGIN
    ALTER TABLE ViewMetadata ADD viewtype NVARCHAR(50) DEFAULT 'System';
END

IF NOT EXISTS (
    SELECT 1 FROM sys.columns 
    WHERE object_id = OBJECT_ID('ViewMetadata') AND name = 'ownerid'
)
BEGIN
    ALTER TABLE ViewMetadata ADD ownerid NVARCHAR(100) NULL;
END
