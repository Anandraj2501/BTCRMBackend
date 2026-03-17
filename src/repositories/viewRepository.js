const { sql, poolPromise } = require('../config/db');

class ViewRepository {
    async saveView(data) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('entitylogicalname', sql.NVarChar(100), data.entitylogicalname)
            .input('viewname', sql.NVarChar(255), data.viewname)
            .input('isdefault', sql.Bit, data.isdefault ? 1 : 0)
            .input('definitionjson', sql.NVarChar(sql.MAX), JSON.stringify(data.definition))
            .query(`
                DECLARE @entityId UNIQUEIDENTIFIER = (SELECT entityid FROM EntityMetadata WHERE logicalname = @entitylogicalname);
                IF @entityId IS NULL THROW 50001, 'Entity not found', 1;
                IF @isdefault = 1
                    UPDATE ViewMetadata SET isdefault = 0 WHERE entityid = @entityId;
                INSERT INTO ViewMetadata (entityid, viewname, isdefault, definitionjson)
                OUTPUT INSERTED.viewid
                VALUES (@entityId, @viewname, @isdefault, @definitionjson);
            `);
        return result.recordset[0];
    }

    async getViewsForEntity(logicalName) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('logicalname', sql.NVarChar(100), logicalName)
            .query(`
                SELECT v.* FROM ViewMetadata v
                JOIN EntityMetadata e ON v.entityid = e.entityid
                WHERE e.logicalname = @logicalname
                ORDER BY v.isdefault DESC, v.createdon DESC
            `);
        return result.recordset.map(r => ({ ...r, definition: JSON.parse(r.definitionjson) }));
    }

    async getDefaultView(logicalName) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('logicalname', sql.NVarChar(100), logicalName)
            .query(`
                SELECT TOP 1 v.* FROM ViewMetadata v
                JOIN EntityMetadata e ON v.entityid = e.entityid
                WHERE e.logicalname = @logicalname
                ORDER BY v.isdefault DESC, v.createdon DESC
            `);
        const row = result.recordset[0];
        if (!row) return null;
        return { ...row, definition: JSON.parse(row.definitionjson) };
    }

    async getViewById(viewId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('viewid', sql.UniqueIdentifier, viewId)
            .query(`SELECT * FROM ViewMetadata WHERE viewid = @viewid`);
        const row = result.recordset[0];
        if (!row) return null;
        return { ...row, definition: JSON.parse(row.definitionjson) };
    }
}

module.exports = new ViewRepository();

