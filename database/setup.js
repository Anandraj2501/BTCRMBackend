const sql = require('mssql/msnodesqlv8');
const fs = require('fs');
const path = require('path');

const masterConfig = {
    connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=master;Trusted_Connection=yes;TrustServerCertificate=yes;'
};

const crmConfig = {
    connectionString: 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=MiniCRM;Trusted_Connection=yes;TrustServerCertificate=yes;'
};

const setupDb = async () => {
    let pool;
    try {
        console.log('Connecting to master to check/create MiniCRM...');
        pool = await sql.connect(masterConfig);
        
        // Check if DB exists
        const result = await pool.request().query("SELECT name FROM sys.databases WHERE name='MiniCRM'");
        if (result.recordset.length === 0) {
            console.log('Creating database MiniCRM...');
            await pool.request().query('CREATE DATABASE MiniCRM');
        } else {
            console.log('Database MiniCRM already exists.');
        }
        await pool.close();
        
        console.log('Connecting to MiniCRM...');
        pool = await sql.connect(crmConfig);
        
        console.log('Creating base tables...');
        // Create EntityMetadata
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='EntityMetadata' AND xtype='U')
            CREATE TABLE EntityMetadata (
                entityid UNIQUEIDENTIFIER PRIMARY KEY,
                logicalname NVARCHAR(100) NOT NULL UNIQUE,
                displayname NVARCHAR(100),
                schemaname NVARCHAR(100),
                primaryidattribute NVARCHAR(100),
                primarynameattribute NVARCHAR(100),
                isactivity BIT,
                iscustomentity BIT,
                createdon DATETIME2,
                modifiedon DATETIME2
            );
        `);
        
        // Create AttributeMetadata
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AttributeMetadata' AND xtype='U')
            CREATE TABLE AttributeMetadata (
                attributeid UNIQUEIDENTIFIER PRIMARY KEY,
                entityid UNIQUEIDENTIFIER FOREIGN KEY REFERENCES EntityMetadata(entityid),
                logicalname NVARCHAR(100),
                displayname NVARCHAR(100),
                schemaname NVARCHAR(100),
                attributetype NVARCHAR(50),
                maxlength INT,
                isnullable BIT,
                isprimaryname BIT,
                createdon DATETIME2
            );
        `);

        // Create Default BaseEntity table
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='BaseEntity' AND xtype='U')
            CREATE TABLE BaseEntity (
                baseentityid UNIQUEIDENTIFIER PRIMARY KEY,
                logicalname NVARCHAR(100),
                ownerid UNIQUEIDENTIFIER,
                createdon DATETIME2,
                createdby UNIQUEIDENTIFIER,
                modifiedon DATETIME2,
                modifiedby UNIQUEIDENTIFIER,
                statecode INT DEFAULT 0,
                statuscode INT
            );
        `);

        // Lookup metadata
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='LookupMetadata' AND xtype='U')
            CREATE TABLE LookupMetadata (
                lookupid UNIQUEIDENTIFIER PRIMARY KEY,
                entityid UNIQUEIDENTIFIER FOREIGN KEY REFERENCES EntityMetadata(entityid),
                attributeid UNIQUEIDENTIFIER FOREIGN KEY REFERENCES AttributeMetadata(attributeid),
                referencedentityid UNIQUEIDENTIFIER FOREIGN KEY REFERENCES EntityMetadata(entityid),
                schemaname NVARCHAR(100),
                relationshiptype NVARCHAR(50)
            );
        `);

        // Polymorphic Lookup
        await pool.request().query(`
            IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='PolymorphicLookup' AND xtype='U')
            CREATE TABLE PolymorphicLookup (
                polymorphiclookupid UNIQUEIDENTIFIER PRIMARY KEY,
                attributeid UNIQUEIDENTIFIER FOREIGN KEY REFERENCES AttributeMetadata(attributeid),
                entityid UNIQUEIDENTIFIER FOREIGN KEY REFERENCES EntityMetadata(entityid),
                referencedentityid UNIQUEIDENTIFIER FOREIGN KEY REFERENCES EntityMetadata(entityid)
            );
        `);
        
        console.log('Executing stored procedures script...');
        const spScript = fs.readFileSync(path.join(__dirname, 'stored_procedures.sql'), 'utf8');
        // MSSQL driver doesn't support GO natively, need to split by GO or execute directly
        const batches = spScript.split(/^GO\s*$/m).map(s => s.trim()).filter(Boolean);
        for (const batch of batches) {
            await pool.request().batch(batch);
        }

        console.log('Database schema successfully initialized!');
    } catch (err) {
        console.error('Error setting up DB:', err);
        if (err.originalError) console.error('Original error:', err.originalError);
    } finally {
        if (pool) await pool.close();
    }
};

setupDb();
