USE MiniCRM;
GO

IF OBJECT_ID('dbo.AuditLog', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.AuditLog (
        auditlogid UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
        entityname NVARCHAR(100) NOT NULL,
        recordid UNIQUEIDENTIFIER NOT NULL,
        action NVARCHAR(50) NOT NULL,
        userid UNIQUEIDENTIFIER NULL,
        userrole NVARCHAR(50) NULL,
        changedata NVARCHAR(MAX) NULL,
        createdon DATETIME2 NOT NULL DEFAULT GETDATE()
    );
END
GO

IF OBJECT_ID('dbo.account', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.account (
        accountid UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        baseentityid UNIQUEIDENTIFIER NOT NULL,
        name NVARCHAR(200) NOT NULL,
        accountnumber NVARCHAR(100) NULL,
        email NVARCHAR(200) NULL,
        phone NVARCHAR(50) NULL,
        street NVARCHAR(200) NULL,
        city NVARCHAR(100) NULL,
        state NVARCHAR(100) NULL,
        country NVARCHAR(100) NULL,
        zip NVARCHAR(20) NULL,
        CONSTRAINT FK_account_baseentity FOREIGN KEY (baseentityid) REFERENCES dbo.BaseEntity(baseentityid)
    );
END
GO

IF OBJECT_ID('dbo.contact', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.contact (
        contactid UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
        baseentityid UNIQUEIDENTIFIER NOT NULL,
        firstname NVARCHAR(100) NOT NULL,
        lastname NVARCHAR(100) NOT NULL,
        fullname AS LTRIM(RTRIM(ISNULL(firstname, '') + ' ' + ISNULL(lastname, ''))),
        email NVARCHAR(200) NULL,
        phone NVARCHAR(50) NULL,
        parentaccountid UNIQUEIDENTIFIER NULL,
        jobtitle NVARCHAR(100) NULL,
        CONSTRAINT FK_contact_baseentity FOREIGN KEY (baseentityid) REFERENCES dbo.BaseEntity(baseentityid)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_contact_account')
BEGIN
    ALTER TABLE dbo.contact
    ADD CONSTRAINT FK_contact_account
        FOREIGN KEY (parentaccountid) REFERENCES dbo.account(accountid);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_account_accountid' AND object_id = OBJECT_ID('dbo.account')
)
BEGIN
    CREATE INDEX IX_account_accountid ON dbo.account(accountid);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_contact_contactid' AND object_id = OBJECT_ID('dbo.contact')
)
BEGIN
    CREATE INDEX IX_contact_contactid ON dbo.contact(contactid);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes WHERE name = 'IX_contact_parentaccountid' AND object_id = OBJECT_ID('dbo.contact')
)
BEGIN
    CREATE INDEX IX_contact_parentaccountid ON dbo.contact(parentaccountid);
END
GO
