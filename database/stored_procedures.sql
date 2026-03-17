CREATE OR ALTER PROCEDURE sp_CreateEntity
    @LogicalName NVARCHAR(100),
    @DisplayName NVARCHAR(100),
    @SchemaName NVARCHAR(100),
    @PrimaryIdAttribute NVARCHAR(100),
    @PrimaryNameAttribute NVARCHAR(100),
    @IsActivity BIT = 0
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Insert into EntityMetadata
        DECLARE @EntityId UNIQUEIDENTIFIER = NEWID();
        
        INSERT INTO EntityMetadata (
            entityid, logicalname, displayname, schemaname, 
            primaryidattribute, primarynameattribute, isactivity, iscustomentity,
            createdon, modifiedon
        )
        VALUES (
            @EntityId, @LogicalName, @DisplayName, @SchemaName,
            @PrimaryIdAttribute, @PrimaryNameAttribute, @IsActivity, 1,
            GETDATE(), GETDATE()
        );

        -- 2. Create physical table
        DECLARE @Sql NVARCHAR(MAX);
        SET @Sql = N'CREATE TABLE ' + QUOTENAME(@LogicalName) + N' (' + char(13) +
                   QUOTENAME(@PrimaryIdAttribute) + N' UNIQUEIDENTIFIER PRIMARY KEY DEFAULT NEWID(),' + char(13) +
                   N'baseentityid UNIQUEIDENTIFIER NOT NULL FOREIGN KEY REFERENCES baseentity(baseentityid),' + char(13) +
                   QUOTENAME(@PrimaryNameAttribute) + N' NVARCHAR(200)' + char(13) +
                   N');';
        
        EXEC sp_executesql @Sql;

        -- 3. Register Primary Attribute in AttributeMetadata
        DECLARE @AttributeId UNIQUEIDENTIFIER = NEWID();
        INSERT INTO AttributeMetadata (
            attributeid, entityid, logicalname, displayname, schemaname,
            attributetype, maxlength, isnullable, isprimaryname, createdon
        )
        VALUES (
            @AttributeId, @EntityId, @PrimaryNameAttribute, @DisplayName + ' Name',
            @SchemaName + 'Name', 'String', 200, 1, 1, GETDATE()
        );

        -- 4. Automatically Register BaseEntityId system column
        DECLARE @BaseAttributeId UNIQUEIDENTIFIER = NEWID();
        INSERT INTO AttributeMetadata (
            attributeid, entityid, logicalname, displayname, schemaname,
            attributetype, maxlength, isnullable, isprimaryname, createdon
        )
        VALUES (
            @BaseAttributeId, @EntityId, 'baseentityid', 'Base Entity Identifier',
            'BaseEntityId', 'Uniqueidentifier', NULL, 0, 0, GETDATE()
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_CreateAttribute
    @EntityLogicalName NVARCHAR(100),
    @LogicalName NVARCHAR(100),
    @DisplayName NVARCHAR(100),
    @SchemaName NVARCHAR(100),
    @AttributeType NVARCHAR(50),
    @MaxLength INT = NULL,
    @IsNullable BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @EntityId UNIQUEIDENTIFIER;
        SELECT @EntityId = entityid FROM EntityMetadata WHERE logicalname = @EntityLogicalName;

        IF @EntityId IS NULL
            THROW 50001, 'Entity not found', 1;

        -- 1. Insert into AttributeMetadata
        DECLARE @AttributeId UNIQUEIDENTIFIER = NEWID();
        INSERT INTO AttributeMetadata (
            attributeid, entityid, logicalname, displayname, schemaname,
            attributetype, maxlength, isnullable, isprimaryname, createdon
        )
        VALUES (
            @AttributeId, @EntityId, @LogicalName, @DisplayName, @SchemaName,
            @AttributeType, @MaxLength, @IsNullable, 0, GETDATE()
        );

        -- 2. Add column to physical table
        DECLARE @SqlType NVARCHAR(50);
        IF @AttributeType = 'String' SET @SqlType = 'NVARCHAR(' + ISNULL(CAST(@MaxLength AS NVARCHAR(10)), 'MAX') + ')';
        ELSE IF @AttributeType = 'Integer' SET @SqlType = 'INT';
        ELSE IF @AttributeType = 'Boolean' SET @SqlType = 'BIT';
        ELSE IF @AttributeType = 'DateTime' SET @SqlType = 'DATETIME2';
        ELSE IF @AttributeType = 'Decimal' SET @SqlType = 'DECIMAL(18,4)';
        ELSE IF @AttributeType = 'Lookup' SET @SqlType = 'UNIQUEIDENTIFIER';
        ELSE IF @AttributeType = 'Uniqueidentifier' SET @SqlType = 'UNIQUEIDENTIFIER';
        ELSE SET @SqlType = 'NVARCHAR(MAX)'; -- Default

        DECLARE @Sql NVARCHAR(MAX);
        SET @Sql = N'ALTER TABLE ' + QUOTENAME(@EntityLogicalName) + 
                   N' ADD ' + QUOTENAME(@LogicalName) + N' ' + @SqlType + 
                   (CASE WHEN @IsNullable = 1 THEN N' NULL' ELSE N' NOT NULL' END) + N';';
        
        EXEC sp_executesql @Sql;

        COMMIT TRANSACTION;
        
        -- Return the newly generated AttributeId so we can use it if it's a lookup
        SELECT @AttributeId AS attributeid;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO

CREATE OR ALTER PROCEDURE sp_CreateLookup
    @EntityLogicalName NVARCHAR(100),
    @AttributeLogicalName NVARCHAR(100),
    @ReferencedEntityLogicalName NVARCHAR(100),
    @SchemaName NVARCHAR(100),
    @RelationshipType NVARCHAR(50) = 'OneToMany'
AS
BEGIN
    SET NOCOUNT ON;
    BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @EntityId UNIQUEIDENTIFIER, @ReferencedEntityId UNIQUEIDENTIFIER, @AttributeId UNIQUEIDENTIFIER;
        
        SELECT @EntityId = entityid FROM EntityMetadata WHERE logicalname = @EntityLogicalName;
        IF @EntityId IS NULL THROW 50001, 'Source entity not found', 1;

        SELECT @ReferencedEntityId = entityid FROM EntityMetadata WHERE logicalname = @ReferencedEntityLogicalName;
        IF @ReferencedEntityId IS NULL THROW 50002, 'Referenced entity not found', 1;

        SELECT @AttributeId = attributeid FROM AttributeMetadata WHERE entityid = @EntityId AND logicalname = @AttributeLogicalName;
        IF @AttributeId IS NULL THROW 50003, 'Attribute not found on source entity', 1;

        -- Check if it's already a polymorphic lookup (we support adding to it)
        -- For a standard DB, we'll usually enforce physical FK for normal lookups. For polymorphic, we might skip physical FKs.
        -- We'll assume physical FKs for standard OneToMany lookups.
        
        IF @RelationshipType = 'Polymorphic'
        BEGIN
            INSERT INTO PolymorphicLookup (polymorphiclookupid, attributeid, entityid, referencedentityid)
            VALUES (NEWID(), @AttributeId, @EntityId, @ReferencedEntityId);
        END
        ELSE
        BEGIN
            -- Standard Lookup
            INSERT INTO LookupMetadata (lookupid, entityid, attributeid, referencedentityid, schemaname, relationshiptype)
            VALUES (NEWID(), @EntityId, @AttributeId, @ReferencedEntityId, @SchemaName, @RelationshipType);

            -- Add physical foreign key
            DECLARE @ReferencedPrimaryIdAttribute NVARCHAR(100);
            SELECT @ReferencedPrimaryIdAttribute = primaryidattribute FROM EntityMetadata WHERE entityid = @ReferencedEntityId;

            DECLARE @Sql NVARCHAR(MAX);
            SET @Sql = N'ALTER TABLE ' + QUOTENAME(@EntityLogicalName) + 
                       N' ADD CONSTRAINT ' + QUOTENAME('FK_' + @SchemaName) + 
                       N' FOREIGN KEY (' + QUOTENAME(@AttributeLogicalName) + N') REFERENCES ' + 
                       QUOTENAME(@ReferencedEntityLogicalName) + N'(' + QUOTENAME(@ReferencedPrimaryIdAttribute) + N');';
            
            -- Ignore errors if polymorphic or already exists (for simple dynamic schema)
            BEGIN TRY
                EXEC sp_executesql @Sql;
            END TRY
            BEGIN CATCH
                -- Just silently catch for polymorphic cases, or print
                PRINT 'Could not create physical foreign key constraint.';
            END CATCH
        END

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH
END;
GO
