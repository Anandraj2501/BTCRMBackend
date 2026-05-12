const { sql, poolPromise } = require('../config/db');
const { ensureAppMetadataSchema } = require('../bootstrap/ensureAppMetadataSchema');

class FormRepository {
    async saveForm(data) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        await pool.request()
            .input('appid', sql.UniqueIdentifier, data.appid || null)
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
                      AND ((appid = @appid) OR (appid IS NULL AND @appid IS NULL));

                IF EXISTS (
                    SELECT 1 FROM FormMetadata
                    WHERE entityid = @entityId
                      AND formkey = @formkey
                      AND ((appid = @appid) OR (appid IS NULL AND @appid IS NULL))
                )
                BEGIN
                    UPDATE FormMetadata
                    SET formname = @formname,
                        isdefault = @isdefault,
                        definitionjson = @definitionjson,
                        modifiedon = GETDATE()
                    WHERE entityid = @entityId
                      AND formkey = @formkey
                      AND ((appid = @appid) OR (appid IS NULL AND @appid IS NULL));
                END
                ELSE
                BEGIN
                    INSERT INTO FormMetadata (appid, entityid, formkey, formname, isdefault, definitionjson)
                    VALUES (@appid, @entityId, @formkey, @formname, @isdefault, @definitionjson);
                END
            `);
    }

    async getFormsForEntity(logicalName, appId = null) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('appid', sql.UniqueIdentifier, appId)
            .input('logicalname', sql.NVarChar(100), logicalName)
            .query(`
                SELECT f.* FROM FormMetadata f
                JOIN EntityMetadata e ON f.entityid = e.entityid
                WHERE e.logicalname = @logicalname
                  AND (@appid IS NULL OR f.appid = @appid)
                ORDER BY f.isdefault DESC, f.createdon DESC
            `);
        return result.recordset.map((row) => ({ ...row, definition: JSON.parse(row.definitionjson) }));
    }

    async getDefaultForm(logicalName, appId = null) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('appid', sql.UniqueIdentifier, appId)
            .input('logicalname', sql.NVarChar(100), logicalName)
            .query(`
                SELECT TOP 1 f.* FROM FormMetadata f
                JOIN EntityMetadata e ON f.entityid = e.entityid
                WHERE e.logicalname = @logicalname
                  AND (@appid IS NULL OR f.appid = @appid)
                ORDER BY f.isdefault DESC, f.createdon DESC
            `);
        const row = result.recordset[0];
        if (!row) return null;
        return { ...row, definition: JSON.parse(row.definitionjson) };
    }

    async getFormsForApp(appId) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('appid', sql.UniqueIdentifier, appId)
            .query(`
                SELECT f.*, e.logicalname AS entitylogicalname
                FROM FormMetadata f
                JOIN EntityMetadata e ON f.entityid = e.entityid
                WHERE f.appid = @appid
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
