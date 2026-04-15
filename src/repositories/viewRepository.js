const { sql, poolPromise } = require('../config/db');
const { ensureAppMetadataSchema } = require('../bootstrap/ensureAppMetadataSchema');

class ViewRepository {
    async saveView(data) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('appid', sql.UniqueIdentifier, data.appid || null)
            .input('entitylogicalname', sql.NVarChar(100), data.entitylogicalname)
            .input('viewname', sql.NVarChar(255), data.viewname)
            .input('viewkey', sql.NVarChar(100), data.viewkey || data.id || 'active')
            .input('isdefault', sql.Bit, data.isdefault ? 1 : 0)
            .input('definitionjson', sql.NVarChar(sql.MAX), JSON.stringify(data.definition))
            .query(`
                DECLARE @entityId UNIQUEIDENTIFIER = (SELECT entityid FROM EntityMetadata WHERE logicalname = @entitylogicalname);
                IF @entityId IS NULL THROW 50001, 'Entity not found', 1;
                IF @isdefault = 1
                    UPDATE ViewMetadata SET isdefault = 0
                    WHERE entityid = @entityId
                      AND ((appid = @appid) OR (appid IS NULL AND @appid IS NULL));

                IF EXISTS (
                    SELECT 1 FROM ViewMetadata
                    WHERE entityid = @entityId
                      AND viewkey = @viewkey
                      AND ((appid = @appid) OR (appid IS NULL AND @appid IS NULL))
                )
                BEGIN
                    UPDATE ViewMetadata
                    SET viewname = @viewname,
                        isdefault = @isdefault,
                        definitionjson = @definitionjson,
                        modifiedon = GETDATE()
                    WHERE entityid = @entityId
                      AND viewkey = @viewkey
                      AND ((appid = @appid) OR (appid IS NULL AND @appid IS NULL));

                    SELECT TOP 1 viewid FROM ViewMetadata
                    WHERE entityid = @entityId
                      AND viewkey = @viewkey
                      AND ((appid = @appid) OR (appid IS NULL AND @appid IS NULL));
                END
                ELSE
                BEGIN
                    INSERT INTO ViewMetadata (appid, entityid, viewkey, viewname, isdefault, definitionjson)
                    OUTPUT INSERTED.viewid
                    VALUES (@appid, @entityId, @viewkey, @viewname, @isdefault, @definitionjson);
                END
            `);
        return result.recordset[0];
    }

    async getViewsForEntity(logicalName, appId = null) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('appid', sql.UniqueIdentifier, appId)
            .input('logicalname', sql.NVarChar(100), logicalName)
            .query(`
                SELECT v.* FROM ViewMetadata v
                JOIN EntityMetadata e ON v.entityid = e.entityid
                WHERE e.logicalname = @logicalname
                  AND (@appid IS NULL OR v.appid = @appid)
                ORDER BY v.isdefault DESC, v.createdon DESC
            `);
        return result.recordset.map(r => ({ ...r, definition: JSON.parse(r.definitionjson) }));
    }

    async getDefaultView(logicalName, appId = null) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('appid', sql.UniqueIdentifier, appId)
            .input('logicalname', sql.NVarChar(100), logicalName)
            .query(`
                SELECT TOP 1 v.* FROM ViewMetadata v
                JOIN EntityMetadata e ON v.entityid = e.entityid
                WHERE e.logicalname = @logicalname
                  AND (@appid IS NULL OR v.appid = @appid)
                ORDER BY v.isdefault DESC, v.createdon DESC
            `);
        const row = result.recordset[0];
        if (!row) return null;
        return { ...row, definition: JSON.parse(row.definitionjson) };
    }

    async getViewById(viewId) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('viewid', sql.UniqueIdentifier, viewId)
            .query(`SELECT * FROM ViewMetadata WHERE viewid = @viewid`);
        const row = result.recordset[0];
        if (!row) return null;
        return { ...row, definition: JSON.parse(row.definitionjson) };
    }

    async getViewsForApp(appId) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('appid', sql.UniqueIdentifier, appId)
            .query(`
                SELECT v.*, e.logicalname AS entitylogicalname
                FROM ViewMetadata v
                JOIN EntityMetadata e ON v.entityid = e.entityid
                WHERE v.appid = @appid
                ORDER BY v.isdefault DESC, v.createdon DESC
            `);
        return result.recordset.map((row) => ({ ...row, definition: JSON.parse(row.definitionjson) }));
    }
}

module.exports = new ViewRepository();

