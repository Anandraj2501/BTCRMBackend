const IMetadataRepository = require('../interfaces/IMetadataRepository');
const { sql, poolPromise } = require('../config/db');

class MetadataRepository extends IMetadataRepository {
    async getEntityMetadata(logicalName) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('logicalname', sql.NVarChar(100), logicalName)
            .query(`SELECT * FROM EntityMetadata WHERE logicalname = @logicalname`);
        return result.recordset[0] || null;
    }

    async getEntityMetadataById(entityId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('entityid', sql.UniqueIdentifier, entityId)
            .query(`SELECT * FROM EntityMetadata WHERE entityid = @entityid`);
        return result.recordset[0] || null;
    }

    async getAllEntitiesMetadata() {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`SELECT * FROM EntityMetadata ORDER BY logicalname ASC`);
        return result.recordset;
    }

    async getAttributesMetadata(entityId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('entityid', sql.UniqueIdentifier, entityId)
            .query(`SELECT * FROM AttributeMetadata WHERE entityid = @entityid`);
        return result.recordset;
    }

    async getEntityLookups(entityId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('entityid', sql.UniqueIdentifier, entityId)
            .query(`
                SELECT l.*, a.logicalname as attributelogicalname, e.logicalname as referencedentityname
                FROM LookupMetadata l
                JOIN AttributeMetadata a ON l.attributeid = a.attributeid
                JOIN EntityMetadata e ON l.referencedentityid = e.entityid
                WHERE l.entityid = @entityid
            `);
        return result.recordset;
    }

    async executeCreateEntitySp(entityData) {
        const pool = await poolPromise;
        await pool.request()
            .input('LogicalName', sql.NVarChar(100), entityData.logicalname)
            .input('DisplayName', sql.NVarChar(100), entityData.displayname)
            .input('SchemaName', sql.NVarChar(100), entityData.schemaname)
            .input('PrimaryIdAttribute', sql.NVarChar(100), entityData.primaryidattribute)
            .input('PrimaryNameAttribute', sql.NVarChar(100), entityData.primarynameattribute)
            .input('IsActivity', sql.Bit, entityData.isactivity ? 1 : 0)
            .execute('sp_CreateEntity');
    }

    async executeCreateAttributeSp(attrData) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('EntityLogicalName', sql.NVarChar(100), attrData.entitylogicalname)
            .input('LogicalName', sql.NVarChar(100), attrData.logicalname)
            .input('DisplayName', sql.NVarChar(100), attrData.displayname)
            .input('SchemaName', sql.NVarChar(100), attrData.schemaname)
            .input('AttributeType', sql.NVarChar(50), attrData.attributetype)
            .input('MaxLength', sql.Int, attrData.maxlength)
            .input('IsNullable', sql.Bit, attrData.isnullable !== false ? 1 : 0)
            .execute('sp_CreateAttribute');
        
        const attributeid = result.recordset?.[0]?.attributeid;
        
        // Update requirementlevel after creation (stored proc doesn't have this param)
        if (attributeid && attrData.requirementlevel && attrData.requirementlevel !== 'None') {
            await pool.request()
                .input('attributeid', sql.UniqueIdentifier, attributeid)
                .input('requirementlevel', sql.NVarChar(20), attrData.requirementlevel)
                .query(`UPDATE AttributeMetadata SET requirementlevel = @requirementlevel WHERE attributeid = @attributeid`);
        }
        
        return result.recordset ? result.recordset[0] : null;
    }

    async executeCreateLookupSp(lookupData) {
        const pool = await poolPromise;
        await pool.request()
            .input('EntityLogicalName', sql.NVarChar(100), lookupData.entitylogicalname)
            .input('AttributeLogicalName', sql.NVarChar(100), lookupData.attributelogicalname)
            .input('ReferencedEntityLogicalName', sql.NVarChar(100), lookupData.referencedentitylogicalname)
            .input('SchemaName', sql.NVarChar(100), lookupData.schemaname)
            .input('RelationshipType', sql.NVarChar(50), lookupData.relationshiptype || 'OneToMany')
            .execute('sp_CreateLookup');
    }

    async updateEntity(logicalName, updateData) {
        const pool = await poolPromise;
        const updateFields = [];
        const request = pool.request();

        if (updateData.displayname) {
            updateFields.push('displayname = @displayname');
            request.input('displayname', sql.NVarChar(100), updateData.displayname);
        }
        if (updateData.schemaname) {
            updateFields.push('schemaname = @schemaname');
            request.input('schemaname', sql.NVarChar(100), updateData.schemaname);
        }
        if (updateData.primaryidattribute) {
            updateFields.push('primaryidattribute = @primaryidattribute');
            request.input('primaryidattribute', sql.NVarChar(100), updateData.primaryidattribute);
        }
        if (updateData.primarynameattribute) {
            updateFields.push('primarynameattribute = @primarynameattribute');
            request.input('primarynameattribute', sql.NVarChar(100), updateData.primarynameattribute);
        }
        if (updateData.isactivity !== undefined) {
            updateFields.push('isactivity = @isactivity');
            request.input('isactivity', sql.Bit, updateData.isactivity);
        }

        if (updateFields.length === 0) return;

        const query = `UPDATE EntityMetadata SET ${updateFields.join(', ')}, modifiedon = GETDATE() WHERE logicalname = @logicalname`;
        request.input('logicalname', sql.NVarChar(100), logicalName);

        await request.query(query);
    }

    async updateAttribute(entityLogicalName, attributeLogicalName, updateData) {
        const pool = await poolPromise;
        const updateFields = [];
        const request = pool.request();

        if (updateData.displayname) {
            updateFields.push('displayname = @displayname');
            request.input('displayname', sql.NVarChar(100), updateData.displayname);
        }
        if (updateData.schemaname) {
            updateFields.push('schemaname = @schemaname');
            request.input('schemaname', sql.NVarChar(100), updateData.schemaname);
        }
        if (updateData.attributetype) {
            updateFields.push('attributetype = @attributetype');
            request.input('attributetype', sql.NVarChar(50), updateData.attributetype);
        }
        if (updateData.maxlength !== undefined) {
            updateFields.push('maxlength = @maxlength');
            request.input('maxlength', sql.Int, updateData.maxlength);
        }
        if (updateData.isnullable !== undefined) {
            updateFields.push('isnullable = @isnullable');
            request.input('isnullable', sql.Bit, updateData.isnullable);
        }

        if (updateFields.length === 0) return;

        const query = `UPDATE AttributeMetadata SET ${updateFields.join(', ')} WHERE entityid = (SELECT entityid FROM EntityMetadata WHERE logicalname = @entitylogicalname) AND logicalname = @attributelogicalname`;
        request.input('entitylogicalname', sql.NVarChar(100), entityLogicalName);
        request.input('attributelogicalname', sql.NVarChar(100), attributeLogicalName);

        await request.query(query);
    }

    async deleteEntityByLogicalName(logicalName) {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);

        await transaction.begin();

        try {
            const entityResult = await new sql.Request(transaction)
                .input('logicalname', sql.NVarChar(100), logicalName)
                .query(`
                    SELECT entityid
                    FROM EntityMetadata
                    WHERE logicalname = @logicalname
                `);

            const entityId = entityResult.recordset[0]?.entityid;

            if (!entityId) {
                await transaction.commit();
                return;
            }

            await new sql.Request(transaction)
                .input('entityid', sql.UniqueIdentifier, entityId)
                .query(`
                    DELETE FROM LookupMetadata
                    WHERE entityid = @entityid OR referencedentityid = @entityid;

                    DELETE FROM AttributeMetadata
                    WHERE entityid = @entityid;

                    DELETE FROM EntityMetadata
                    WHERE entityid = @entityid;
                `);

            const tableResult = await new sql.Request(transaction)
                .input('logicalname', sql.NVarChar(100), logicalName)
                .query(`
                    SELECT
                        t.object_id,
                        QUOTENAME(s.name) + '.' + QUOTENAME(t.name) AS qualifiedTableName
                    FROM sys.tables t
                    INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
                    WHERE t.name = @logicalname
                `);

            const table = tableResult.recordset[0];

            if (table) {
                const foreignKeysResult = await new sql.Request(transaction)
                    .input('objectid', sql.Int, table.object_id)
                    .query(`
                        SELECT
                            QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) AS parentTableName,
                            QUOTENAME(name) AS constraintName
                        FROM sys.foreign_keys
                        WHERE referenced_object_id = @objectid
                    `);

                for (const foreignKey of foreignKeysResult.recordset) {
                    await new sql.Request(transaction).query(`
                        ALTER TABLE ${foreignKey.parentTableName}
                        DROP CONSTRAINT ${foreignKey.constraintName}
                    `);
                }

                await new sql.Request(transaction).query(`DROP TABLE ${table.qualifiedTableName}`);
            }

            await transaction.commit();
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = new MetadataRepository();
