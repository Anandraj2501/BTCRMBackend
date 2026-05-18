const { sql, poolPromise } = require('../config/db');
const { ensureAppMetadataSchema } = require('../bootstrap/ensureAppMetadataSchema');

class FormRepository {
    async saveForm(data) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        await pool.request()
            .input('entitylogicalname', sql.NVarChar(100), data.entitylogicalname)
            .input('formname', sql.NVarChar(255), data.formname)
            .input('formkey', sql.NVarChar(100), data.formkey || data.id || 'main')
            .input('isdefault', sql.Bit, data.isdefault ? 1 : 0)
            .input('definitionjson', sql.NVarChar(sql.MAX), JSON.stringify(data.definition))
            .query(`
                DECLARE @entityId UNIQUEIDENTIFIER = (SELECT entityid FROM EntityMetadata WHERE logicalname = @entitylogicalname);
                IF @entityId IS NULL THROW 50001, 'Entity not found', 1;
                -- If marking as default, unset others first
                IF @isdefault = 1
                    UPDATE FormMetadata SET isdefault = 0
                    WHERE entityid = @entityId
                      AND appid IS NULL;

                IF EXISTS (
                    SELECT 1 FROM FormMetadata
                    WHERE entityid = @entityId
                      AND formkey = @formkey
                      AND appid IS NULL
                )
                BEGIN
                    UPDATE FormMetadata
                    SET formname = @formname,
                        isdefault = @isdefault,
                        definitionjson = @definitionjson,
                        appid = NULL,
                        modifiedon = GETDATE()
                    WHERE entityid = @entityId
                      AND formkey = @formkey
                      AND appid IS NULL;
                END
                ELSE
                BEGIN
                    INSERT INTO FormMetadata (appid, entityid, formkey, formname, isdefault, definitionjson)
                    VALUES (NULL, @entityId, @formkey, @formname, @isdefault, @definitionjson);
                END
            `);
    }

    async getFormsForEntity(logicalName) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('logicalname', sql.NVarChar(100), logicalName)
            .query(`
                SELECT f.* FROM FormMetadata f
                JOIN EntityMetadata e ON f.entityid = e.entityid
                WHERE e.logicalname = @logicalname
                  AND f.appid IS NULL
                ORDER BY f.isdefault DESC, f.createdon DESC
            `);
        return result.recordset.map((row) => ({ ...row, definition: JSON.parse(row.definitionjson) }));
    }

    async getDefaultForm(logicalName) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('logicalname', sql.NVarChar(100), logicalName)
            .query(`
                SELECT TOP 1 f.* FROM FormMetadata f
                JOIN EntityMetadata e ON f.entityid = e.entityid
                WHERE e.logicalname = @logicalname
                  AND f.appid IS NULL
                ORDER BY f.isdefault DESC, f.createdon DESC
            `);
        const row = result.recordset[0];
        if (!row) return null;
        return { ...row, definition: JSON.parse(row.definitionjson) };
    }

    async getFormsForEntities(entityNames = []) {
        await ensureAppMetadataSchema();
        if (!Array.isArray(entityNames) || entityNames.length === 0) {
            return [];
        }
        const pool = await poolPromise;
        const request = pool.request();
        const params = entityNames.map((logicalName, index) => {
            const name = `logicalname${index}`;
            request.input(name, sql.NVarChar(100), logicalName);
            return `@${name}`;
        });
        const result = await request
            .query(`
                SELECT f.*, e.logicalname AS entitylogicalname
                FROM FormMetadata f
                JOIN EntityMetadata e ON f.entityid = e.entityid
                WHERE e.logicalname IN (${params.join(', ')})
                  AND f.appid IS NULL
                ORDER BY f.isdefault DESC, f.createdon DESC
            `);
        return result.recordset.map((row) => ({ ...row, definition: JSON.parse(row.definitionjson) }));
    }

    async listAllForms() {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT f.*, e.logicalname AS entitylogicalname
            FROM FormMetadata f
            JOIN EntityMetadata e ON f.entityid = e.entityid
            ORDER BY f.modifiedon DESC, f.createdon DESC
        `);
        return result.recordset.map((row) => ({ ...row, definition: JSON.parse(row.definitionjson) }));
    }

    async getFormById(formId) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('formid', sql.UniqueIdentifier, formId)
            .query(`
                SELECT f.*, e.logicalname AS entitylogicalname
                FROM FormMetadata f
                JOIN EntityMetadata e ON f.entityid = e.entityid
                WHERE f.formid = @formid
            `);
        const row = result.recordset[0];
        return row ? { ...row, definition: JSON.parse(row.definitionjson) } : null;
    }
}

module.exports = new FormRepository();
