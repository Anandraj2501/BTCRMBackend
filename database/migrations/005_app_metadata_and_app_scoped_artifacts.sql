USE MiniCRM;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'AppMetadata')
BEGIN
    CREATE TABLE AppMetadata (
        appid UNIQUEIDENTIFIER PRIMARY KEY,
        appname NVARCHAR(255) NOT NULL,
        description NVARCHAR(MAX) NULL,
        apptype NVARCHAR(50) NOT NULL DEFAULT 'Model-driven',
        ownername NVARCHAR(255) NOT NULL DEFAULT 'Admin',
        draftversion INT NOT NULL DEFAULT 1,
        publishedversion INT NOT NULL DEFAULT 0,
        draftdefinitionjson NVARCHAR(MAX) NOT NULL,
        publisheddefinitionjson NVARCHAR(MAX) NULL,
        createdon DATETIME NOT NULL DEFAULT GETDATE(),
        modifiedon DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

IF COL_LENGTH('FormMetadata', 'appid') IS NULL
BEGIN
    ALTER TABLE FormMetadata ADD appid UNIQUEIDENTIFIER NULL;
    ALTER TABLE FormMetadata ADD CONSTRAINT FK_FormMetadata_AppMetadata FOREIGN KEY (appid) REFERENCES AppMetadata(appid);
END
GO

IF COL_LENGTH('FormMetadata', 'formkey') IS NULL
BEGIN
    ALTER TABLE FormMetadata ADD formkey NVARCHAR(100) NULL;
END
GO

IF COL_LENGTH('FormMetadata', 'modifiedon') IS NULL
BEGIN
    ALTER TABLE FormMetadata ADD modifiedon DATETIME NOT NULL DEFAULT GETDATE();
END
GO

IF COL_LENGTH('ViewMetadata', 'appid') IS NULL
BEGIN
    ALTER TABLE ViewMetadata ADD appid UNIQUEIDENTIFIER NULL;
    ALTER TABLE ViewMetadata ADD CONSTRAINT FK_ViewMetadata_AppMetadata FOREIGN KEY (appid) REFERENCES AppMetadata(appid);
END
GO

IF COL_LENGTH('ViewMetadata', 'viewkey') IS NULL
BEGIN
    ALTER TABLE ViewMetadata ADD viewkey NVARCHAR(100) NULL;
END
GO

IF COL_LENGTH('ViewMetadata', 'modifiedon') IS NULL
BEGIN
    ALTER TABLE ViewMetadata ADD modifiedon DATETIME NOT NULL DEFAULT GETDATE();
END
GO
