const { poolPromise } = require('../config/db');

let ensureSalesModulePromise = null;

async function ensureSalesModuleSchema() {
    if (ensureSalesModulePromise) {
        return ensureSalesModulePromise;
    }

    ensureSalesModulePromise = (async () => {
        const pool = await poolPromise;

        await pool.request().batch(`
            IF OBJECT_ID('dbo.EntityMetadata', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.EntityMetadata (
                    entityid UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                    logicalname NVARCHAR(100) NOT NULL UNIQUE,
                    displayname NVARCHAR(100) NULL,
                    schemaname NVARCHAR(100) NULL,
                    primaryidattribute NVARCHAR(100) NULL,
                    primarynameattribute NVARCHAR(100) NULL,
                    isactivity BIT NULL,
                    iscustomentity BIT NULL,
                    createdon DATETIME2 NULL,
                    modifiedon DATETIME2 NULL
                );
            END;

            IF OBJECT_ID('dbo.AttributeMetadata', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.AttributeMetadata (
                    attributeid UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                    entityid UNIQUEIDENTIFIER NOT NULL,
                    logicalname NVARCHAR(100) NOT NULL,
                    displayname NVARCHAR(100) NULL,
                    schemaname NVARCHAR(100) NULL,
                    attributetype NVARCHAR(50) NULL,
                    maxlength INT NULL,
                    isnullable BIT NULL,
                    isprimaryname BIT NULL,
                    createdon DATETIME2 NULL,
                    CONSTRAINT FK_AttributeMetadata_EntityMetadata
                        FOREIGN KEY (entityid) REFERENCES dbo.EntityMetadata(entityid)
                );
            END;

            IF OBJECT_ID('dbo.BaseEntity', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.BaseEntity (
                    baseentityid UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                    logicalname NVARCHAR(100) NULL,
                    ownerid UNIQUEIDENTIFIER NULL,
                    createdon DATETIME2 NULL,
                    createdby UNIQUEIDENTIFIER NULL,
                    modifiedon DATETIME2 NULL,
                    modifiedby UNIQUEIDENTIFIER NULL,
                    statecode INT NOT NULL DEFAULT 0,
                    statuscode INT NOT NULL DEFAULT 1
                );
            END;

            IF OBJECT_ID('dbo.LookupMetadata', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.LookupMetadata (
                    lookupid UNIQUEIDENTIFIER NOT NULL PRIMARY KEY,
                    entityid UNIQUEIDENTIFIER NOT NULL,
                    attributeid UNIQUEIDENTIFIER NOT NULL,
                    referencedentityid UNIQUEIDENTIFIER NOT NULL,
                    schemaname NVARCHAR(100) NULL,
                    relationshiptype NVARCHAR(50) NULL,
                    CONSTRAINT FK_LookupMetadata_EntityMetadata
                        FOREIGN KEY (entityid) REFERENCES dbo.EntityMetadata(entityid),
                    CONSTRAINT FK_LookupMetadata_AttributeMetadata
                        FOREIGN KEY (attributeid) REFERENCES dbo.AttributeMetadata(attributeid),
                    CONSTRAINT FK_LookupMetadata_ReferencedEntity
                        FOREIGN KEY (referencedentityid) REFERENCES dbo.EntityMetadata(entityid)
                );
            END;

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
            END;
        `);

        await pool.request().batch(`
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
            END;

            IF COL_LENGTH('dbo.account', 'baseentityid') IS NULL
            BEGIN
                ALTER TABLE dbo.account ADD baseentityid UNIQUEIDENTIFIER NULL;
            END;

            IF COL_LENGTH('dbo.account', 'name') IS NULL
            BEGIN
                ALTER TABLE dbo.account ADD name NVARCHAR(200) NULL;
            END;

            IF COL_LENGTH('dbo.account', 'accountnumber') IS NULL
            BEGIN
                ALTER TABLE dbo.account ADD accountnumber NVARCHAR(100) NULL;
            END;

            IF COL_LENGTH('dbo.account', 'email') IS NULL
            BEGIN
                ALTER TABLE dbo.account ADD email NVARCHAR(200) NULL;
            END;

            IF COL_LENGTH('dbo.account', 'phone') IS NULL
            BEGIN
                ALTER TABLE dbo.account ADD phone NVARCHAR(50) NULL;
            END;

            IF COL_LENGTH('dbo.account', 'street') IS NULL
            BEGIN
                ALTER TABLE dbo.account ADD street NVARCHAR(200) NULL;
            END;

            IF COL_LENGTH('dbo.account', 'city') IS NULL
            BEGIN
                ALTER TABLE dbo.account ADD city NVARCHAR(100) NULL;
            END;

            IF COL_LENGTH('dbo.account', 'state') IS NULL
            BEGIN
                ALTER TABLE dbo.account ADD state NVARCHAR(100) NULL;
            END;

            IF COL_LENGTH('dbo.account', 'country') IS NULL
            BEGIN
                ALTER TABLE dbo.account ADD country NVARCHAR(100) NULL;
            END;

            IF COL_LENGTH('dbo.account', 'zip') IS NULL
            BEGIN
                ALTER TABLE dbo.account ADD zip NVARCHAR(20) NULL;
            END;

            IF COL_LENGTH('dbo.account', 'accounttype') IS NULL
            BEGIN
                ALTER TABLE dbo.account ADD accounttype NVARCHAR(20) NOT NULL CONSTRAINT DF_account_accounttype DEFAULT 'Bronze';
            END;

            IF NOT EXISTS (
                SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_account_baseentity'
            ) AND COL_LENGTH('dbo.account', 'baseentityid') IS NOT NULL
            BEGIN
                ALTER TABLE dbo.account
                ADD CONSTRAINT FK_account_baseentity
                    FOREIGN KEY (baseentityid) REFERENCES dbo.BaseEntity(baseentityid);
            END;

            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_account_accountid' AND object_id = OBJECT_ID('dbo.account')
            )
            BEGIN
                CREATE INDEX IX_account_accountid ON dbo.account(accountid);
            END;

            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_account_name' AND object_id = OBJECT_ID('dbo.account')
            )
            BEGIN
                CREATE INDEX IX_account_name ON dbo.account(name);
            END;

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
            END;

            IF COL_LENGTH('dbo.contact', 'baseentityid') IS NULL
            BEGIN
                ALTER TABLE dbo.contact ADD baseentityid UNIQUEIDENTIFIER NULL;
            END;

            IF COL_LENGTH('dbo.contact', 'firstname') IS NULL
            BEGIN
                ALTER TABLE dbo.contact ADD firstname NVARCHAR(100) NULL;
            END;

            IF COL_LENGTH('dbo.contact', 'lastname') IS NULL
            BEGIN
                ALTER TABLE dbo.contact ADD lastname NVARCHAR(100) NULL;
            END;

            IF COL_LENGTH('dbo.contact', 'email') IS NULL
            BEGIN
                ALTER TABLE dbo.contact ADD email NVARCHAR(200) NULL;
            END;

            IF COL_LENGTH('dbo.contact', 'phone') IS NULL
            BEGIN
                ALTER TABLE dbo.contact ADD phone NVARCHAR(50) NULL;
            END;

            IF COL_LENGTH('dbo.contact', 'parentaccountid') IS NULL
            BEGIN
                ALTER TABLE dbo.contact ADD parentaccountid UNIQUEIDENTIFIER NULL;
            END;

            IF COL_LENGTH('dbo.contact', 'jobtitle') IS NULL
            BEGIN
                ALTER TABLE dbo.contact ADD jobtitle NVARCHAR(100) NULL;
            END;

            IF COL_LENGTH('dbo.contact', 'fullname') IS NULL
            BEGIN
                ALTER TABLE dbo.contact
                ADD fullname AS LTRIM(RTRIM(ISNULL(firstname, '') + ' ' + ISNULL(lastname, '')));
            END;

            IF NOT EXISTS (
                SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_contact_baseentity'
            ) AND COL_LENGTH('dbo.contact', 'baseentityid') IS NOT NULL
            BEGIN
                ALTER TABLE dbo.contact
                ADD CONSTRAINT FK_contact_baseentity
                    FOREIGN KEY (baseentityid) REFERENCES dbo.BaseEntity(baseentityid);
            END;

            IF NOT EXISTS (
                SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_contact_account'
            ) AND COL_LENGTH('dbo.contact', 'parentaccountid') IS NOT NULL
            BEGIN
                ALTER TABLE dbo.contact
                ADD CONSTRAINT FK_contact_account
                    FOREIGN KEY (parentaccountid) REFERENCES dbo.account(accountid);
            END;

            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_contact_contactid' AND object_id = OBJECT_ID('dbo.contact')
            )
            BEGIN
                CREATE INDEX IX_contact_contactid ON dbo.contact(contactid);
            END;

            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_contact_parentaccountid' AND object_id = OBJECT_ID('dbo.contact')
            )
            BEGIN
                CREATE INDEX IX_contact_parentaccountid ON dbo.contact(parentaccountid);
            END;

            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_contact_fullname' AND object_id = OBJECT_ID('dbo.contact')
            )
            BEGIN
                CREATE INDEX IX_contact_fullname ON dbo.contact(fullname);
            END;

            IF OBJECT_ID('dbo.SLAs', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.SLAs (
                    SLAId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
                    Name NVARCHAR(200) NOT NULL,
                    ApplicableEntity NVARCHAR(50) NOT NULL CONSTRAINT DF_SLAs_ApplicableEntity DEFAULT 'Case',
                    IsDefault BIT NOT NULL DEFAULT 0,
                    Status NVARCHAR(20) NOT NULL DEFAULT 'Active',
                    CreatedOn DATETIME2 NOT NULL DEFAULT GETDATE()
                );
            END;

            IF OBJECT_ID('dbo.SLA_Items', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.SLA_Items (
                    SLAItemId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
                    SLAId UNIQUEIDENTIFIER NOT NULL,
                    Name NVARCHAR(200) NOT NULL,
                    ApplicableWhen NVARCHAR(MAX) NULL,
                    FirstResponseTime INT NOT NULL,
                    ResolutionTime INT NOT NULL,
                    SortOrder INT NOT NULL DEFAULT 0,
                    CreatedOn DATETIME2 NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT FK_SLA_Items_SLAs FOREIGN KEY (SLAId) REFERENCES dbo.SLAs(SLAId)
                );
            END;

            IF OBJECT_ID('dbo.Entitlements', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.Entitlements (
                    EntitlementId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
                    AccountId UNIQUEIDENTIFIER NOT NULL,
                    SLAId UNIQUEIDENTIFIER NOT NULL,
                    StartDate DATETIME2 NOT NULL,
                    EndDate DATETIME2 NOT NULL,
                    Status NVARCHAR(20) NOT NULL DEFAULT 'Active',
                    CreatedOn DATETIME2 NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT FK_Entitlements_account FOREIGN KEY (AccountId) REFERENCES dbo.account(accountid),
                    CONSTRAINT FK_Entitlements_SLAs FOREIGN KEY (SLAId) REFERENCES dbo.SLAs(SLAId)
                );
            END;

            IF OBJECT_ID('dbo.Cases', 'U') IS NULL
            BEGIN
                CREATE TABLE dbo.Cases (
                    CaseId UNIQUEIDENTIFIER NOT NULL PRIMARY KEY DEFAULT NEWID(),
                    Title NVARCHAR(200) NOT NULL,
                    Description NVARCHAR(MAX) NULL,
                    TicketNumber NVARCHAR(100) NOT NULL,
                    Priority NVARCHAR(20) NOT NULL DEFAULT 'Medium',
                    Status NVARCHAR(20) NOT NULL DEFAULT 'Active',
                    AccountId UNIQUEIDENTIFIER NOT NULL,
                    ContactId UNIQUEIDENTIFIER NULL,
                    SLAId UNIQUEIDENTIFIER NULL,
                    FirstResponseDueDate DATETIME2 NULL,
                    ResolutionDueDate DATETIME2 NULL,
                    FirstResponseActualTime DATETIME2 NULL,
                    ResolutionActualTime DATETIME2 NULL,
                    SLAStatus NVARCHAR(20) NOT NULL DEFAULT 'InProgress',
                    CreatedOn DATETIME2 NOT NULL DEFAULT GETDATE(),
                    ModifiedOn DATETIME2 NOT NULL DEFAULT GETDATE(),
                    CONSTRAINT FK_Cases_account FOREIGN KEY (AccountId) REFERENCES dbo.account(accountid),
                    CONSTRAINT FK_Cases_contact FOREIGN KEY (ContactId) REFERENCES dbo.contact(contactid),
                    CONSTRAINT FK_Cases_SLAs FOREIGN KEY (SLAId) REFERENCES dbo.SLAs(SLAId)
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_Cases_AccountId' AND object_id = OBJECT_ID('dbo.Cases')
            )
            BEGIN
                CREATE INDEX IX_Cases_AccountId ON dbo.Cases(AccountId);
            END;

            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_Cases_ContactId' AND object_id = OBJECT_ID('dbo.Cases')
            )
            BEGIN
                CREATE INDEX IX_Cases_ContactId ON dbo.Cases(ContactId);
            END;

            IF NOT EXISTS (
                SELECT 1 FROM sys.indexes
                WHERE name = 'IX_Entitlements_AccountId_Status' AND object_id = OBJECT_ID('dbo.Entitlements')
            )
            BEGIN
                CREATE INDEX IX_Entitlements_AccountId_Status ON dbo.Entitlements(AccountId, Status, StartDate, EndDate);
            END;

            IF NOT EXISTS (SELECT 1 FROM dbo.SLAs WHERE ApplicableEntity = 'Case' AND IsDefault = 1)
            BEGIN
                DECLARE @DefaultSlaId UNIQUEIDENTIFIER = NEWID();

                INSERT INTO dbo.SLAs (SLAId, Name, ApplicableEntity, IsDefault, Status)
                VALUES (@DefaultSlaId, 'Default Case SLA', 'Case', 1, 'Active');

                INSERT INTO dbo.SLA_Items (
                    SLAItemId, SLAId, Name, ApplicableWhen, FirstResponseTime, ResolutionTime, SortOrder
                )
                VALUES
                    (NEWID(), @DefaultSlaId, 'High priority Gold account', '{"priority":"High","accountType":"Gold"}', 15, 240, 10),
                    (NEWID(), @DefaultSlaId, 'High priority standard account', '{"priority":"High"}', 30, 480, 20),
                    (NEWID(), @DefaultSlaId, 'Medium priority', '{"priority":"Medium"}', 60, 1440, 30),
                    (NEWID(), @DefaultSlaId, 'Low priority', '{"priority":"Low"}', 240, 2880, 40),
                    (NEWID(), @DefaultSlaId, 'Fallback', '{}', 120, 1440, 100);
            END;
        `);

        await pool.request().batch(`
            DECLARE @AccountEntityId UNIQUEIDENTIFIER = (
                SELECT entityid FROM dbo.EntityMetadata WHERE logicalname = 'account'
            );

            IF @AccountEntityId IS NULL
            BEGIN
                SET @AccountEntityId = NEWID();
                INSERT INTO dbo.EntityMetadata (
                    entityid, logicalname, displayname, schemaname,
                    primaryidattribute, primarynameattribute, isactivity, iscustomentity, createdon, modifiedon
                )
                VALUES (
                    @AccountEntityId, 'account', 'Account', 'Account',
                    'accountid', 'name', 0, 0, GETDATE(), GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @AccountEntityId AND logicalname = 'baseentityid'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @AccountEntityId, 'baseentityid', 'Base Entity Identifier', 'BaseEntityId',
                    'Uniqueidentifier', NULL, 0, 0, GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @AccountEntityId AND logicalname = 'name'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @AccountEntityId, 'name', 'Name', 'Name',
                    'String', 200, 0, 1, GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @AccountEntityId AND logicalname = 'accountnumber'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @AccountEntityId, 'accountnumber', 'Account Number', 'AccountNumber',
                    'String', 100, 1, 0, GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @AccountEntityId AND logicalname = 'email'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @AccountEntityId, 'email', 'Email', 'Email',
                    'String', 200, 1, 0, GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @AccountEntityId AND logicalname = 'phone'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @AccountEntityId, 'phone', 'Phone', 'Phone',
                    'String', 50, 1, 0, GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @AccountEntityId AND logicalname = 'street'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @AccountEntityId, 'street', 'Street', 'Street',
                    'String', 200, 1, 0, GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @AccountEntityId AND logicalname = 'city'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @AccountEntityId, 'city', 'City', 'City',
                    'String', 100, 1, 0, GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @AccountEntityId AND logicalname = 'state'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @AccountEntityId, 'state', 'State', 'State',
                    'String', 100, 1, 0, GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @AccountEntityId AND logicalname = 'country'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @AccountEntityId, 'country', 'Country', 'Country',
                    'String', 100, 1, 0, GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @AccountEntityId AND logicalname = 'zip'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @AccountEntityId, 'zip', 'Zip', 'Zip',
                    'String', 20, 1, 0, GETDATE()
                );
            END;

            DECLARE @ContactEntityId UNIQUEIDENTIFIER = (
                SELECT entityid FROM dbo.EntityMetadata WHERE logicalname = 'contact'
            );

            IF @ContactEntityId IS NULL
            BEGIN
                SET @ContactEntityId = NEWID();
                INSERT INTO dbo.EntityMetadata (
                    entityid, logicalname, displayname, schemaname,
                    primaryidattribute, primarynameattribute, isactivity, iscustomentity, createdon, modifiedon
                )
                VALUES (
                    @ContactEntityId, 'contact', 'Contact', 'Contact',
                    'contactid', 'fullname', 0, 0, GETDATE(), GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @ContactEntityId AND logicalname = 'baseentityid'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @ContactEntityId, 'baseentityid', 'Base Entity Identifier', 'BaseEntityId',
                    'Uniqueidentifier', NULL, 0, 0, GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @ContactEntityId AND logicalname = 'firstname'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @ContactEntityId, 'firstname', 'First Name', 'FirstName',
                    'String', 100, 0, 0, GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @ContactEntityId AND logicalname = 'lastname'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @ContactEntityId, 'lastname', 'Last Name', 'LastName',
                    'String', 100, 0, 0, GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @ContactEntityId AND logicalname = 'fullname'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @ContactEntityId, 'fullname', 'Full Name', 'FullName',
                    'String', 201, 0, 1, GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @ContactEntityId AND logicalname = 'email'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @ContactEntityId, 'email', 'Email', 'Email',
                    'String', 200, 1, 0, GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @ContactEntityId AND logicalname = 'phone'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @ContactEntityId, 'phone', 'Phone', 'Phone',
                    'String', 50, 1, 0, GETDATE()
                );
            END;

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @ContactEntityId AND logicalname = 'parentaccountid'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @ContactEntityId, 'parentaccountid', 'Account', 'ParentAccountId',
                    'Lookup', NULL, 1, 0, GETDATE()
                );
            END;

            UPDATE dbo.AttributeMetadata
            SET displayname = 'Account'
            WHERE entityid = @ContactEntityId
              AND logicalname = 'parentaccountid'
              AND displayname <> 'Account';

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata WHERE entityid = @ContactEntityId AND logicalname = 'jobtitle'
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                ) VALUES (
                    NEWID(), @ContactEntityId, 'jobtitle', 'Job Title', 'JobTitle',
                    'String', 100, 1, 0, GETDATE()
                );
            END;

            DECLARE @ParentAccountAttributeId UNIQUEIDENTIFIER = (
                SELECT attributeid FROM dbo.AttributeMetadata
                WHERE entityid = @ContactEntityId AND logicalname = 'parentaccountid'
            );

            IF NOT EXISTS (
                SELECT 1
                FROM dbo.LookupMetadata
                WHERE entityid = @ContactEntityId
                  AND attributeid = @ParentAccountAttributeId
                  AND referencedentityid = @AccountEntityId
            )
            BEGIN
                INSERT INTO dbo.LookupMetadata (
                    lookupid, entityid, attributeid, referencedentityid, schemaname, relationshiptype
                ) VALUES (
                    NEWID(), @ContactEntityId, @ParentAccountAttributeId, @AccountEntityId, 'FK_contact_account', 'OneToMany'
                );
            END;
        `);
    })();

    try {
        await ensureSalesModulePromise;
    } catch (error) {
        ensureSalesModulePromise = null;
        throw error;
    }
}

module.exports = { ensureSalesModuleSchema };
