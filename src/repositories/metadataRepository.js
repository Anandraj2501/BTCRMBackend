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
}

module.exports = new MetadataRepository();
