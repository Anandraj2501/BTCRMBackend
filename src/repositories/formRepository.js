const { sql, poolPromise } = require('../config/db');

class FormRepository {
    async saveForm(data) {
        const pool = await poolPromise;
        await pool.request()
            .input('entitylogicalname', sql.NVarChar(100), data.entitylogicalname)
            .input('formname', sql.NVarChar(255), data.formname)
            .input('isdefault', sql.Bit, data.isdefault ? 1 : 0)
            .input('definitionjson', sql.NVarChar(sql.MAX), JSON.stringify(data.definition))
            .query(`
                DECLARE @entityId UNIQUEIDENTIFIER = (SELECT entityid FROM EntityMetadata WHERE logicalname = @entitylogicalname);
                IF @entityId IS NULL THROW 50001, 'Entity not found', 1;
                -- If marking as default, unset others first
                IF @isdefault = 1
                    UPDATE FormMetadata SET isdefault = 0 WHERE entityid = @entityId;
                INSERT INTO FormMetadata (entityid, formname, isdefault, definitionjson)
                VALUES (@entityId, @formname, @isdefault, @definitionjson);
            `);
    }

    async getFormsForEntity(logicalName) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('logicalname', sql.NVarChar(100), logicalName)
            .query(`
                SELECT f.* FROM FormMetadata f
                JOIN EntityMetadata e ON f.entityid = e.entityid
                WHERE e.logicalname = @logicalname
                ORDER BY f.isdefault DESC, f.createdon DESC
            `);
        return result.recordset;
    }

    async getDefaultForm(logicalName) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('logicalname', sql.NVarChar(100), logicalName)
            .query(`
                SELECT TOP 1 f.* FROM FormMetadata f
                JOIN EntityMetadata e ON f.entityid = e.entityid
                WHERE e.logicalname = @logicalname
                ORDER BY f.isdefault DESC, f.createdon DESC
            `);
        const row = result.recordset[0];
        if (!row) return null;
        return { ...row, definition: JSON.parse(row.definitionjson) };
    }
}

module.exports = new FormRepository();
