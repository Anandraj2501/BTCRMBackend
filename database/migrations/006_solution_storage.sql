USE MiniCRM;
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Solutions')
BEGIN
    CREATE TABLE Solutions (
        id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        displayname NVARCHAR(255) NOT NULL,
        uniquename NVARCHAR(255) NOT NULL,
        version NVARCHAR(50) NOT NULL DEFAULT '1.0.0.0',
        publisher NVARCHAR(255) NOT NULL DEFAULT 'Default Publisher',
        ismanaged BIT NOT NULL DEFAULT 0,
        createdon DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_Solutions_UniqueName'
      AND object_id = OBJECT_ID('Solutions')
)
BEGIN
    CREATE UNIQUE INDEX UX_Solutions_UniqueName
    ON Solutions (uniquename);
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Components')
BEGIN
    CREATE TABLE Components (
        id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        type NVARCHAR(50) NOT NULL,
        name NVARCHAR(255) NOT NULL,
        logicalname NVARCHAR(255) NULL,
        metadatajson NVARCHAR(MAX) NULL,
        createdon DATETIME NOT NULL DEFAULT GETDATE()
    );
END
GO

IF COL_LENGTH('Components', 'logicalname') IS NULL
BEGIN
    ALTER TABLE Components ADD logicalname NVARCHAR(255) NULL;
END
GO

IF COL_LENGTH('Components', 'metadatajson') IS NULL
BEGIN
    ALTER TABLE Components ADD metadatajson NVARCHAR(MAX) NULL;
END
GO

IF COL_LENGTH('Components', 'createdon') IS NULL
BEGIN
    ALTER TABLE Components ADD createdon DATETIME NOT NULL DEFAULT GETDATE();
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_Components_Type_LogicalName'
      AND object_id = OBJECT_ID('Components')
)
BEGIN
    CREATE INDEX IX_Components_Type_LogicalName
    ON Components (type, logicalname);
END
GO

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'SolutionComponents')
BEGIN
    CREATE TABLE SolutionComponents (
        id UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        solutionid UNIQUEIDENTIFIER NOT NULL,
        componentid UNIQUEIDENTIFIER NOT NULL,
        componenttype NVARCHAR(50) NOT NULL,
        addedon DATETIME NOT NULL DEFAULT GETDATE(),
        isexisting BIT NOT NULL DEFAULT 1,
        CONSTRAINT FK_SolutionComponents_Solutions FOREIGN KEY (solutionid) REFERENCES Solutions(id) ON DELETE CASCADE,
        CONSTRAINT FK_SolutionComponents_Components FOREIGN KEY (componentid) REFERENCES Components(id) ON DELETE CASCADE
    );
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'UX_SolutionComponents_Solution_Component'
      AND object_id = OBJECT_ID('SolutionComponents')
)
BEGIN
    CREATE UNIQUE INDEX UX_SolutionComponents_Solution_Component
    ON SolutionComponents (solutionid, componentid);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE name = 'IX_SolutionComponents_ComponentId'
      AND object_id = OBJECT_ID('SolutionComponents')
)
BEGIN
    CREATE INDEX IX_SolutionComponents_ComponentId
    ON SolutionComponents (componentid);
END
GO
