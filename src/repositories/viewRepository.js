const { sql, poolPromise } = require('../config/db');
const { ensureAppMetadataSchema } = require('../bootstrap/ensureAppMetadataSchema');

class ViewRepository {
    async saveView(data) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('entitylogicalname', sql.NVarChar(100), data.entitylogicalname)
            .input('viewname', sql.NVarChar(255), data.viewname)
            .input('viewkey', sql.NVarChar(100), data.viewkey || data.id || 'active')
            .input('isdefault', sql.Bit, data.isdefault ? 1 : 0)
            .input('viewtype', sql.NVarChar(50), data.viewtype || 'System')
            .input('ownerid', sql.NVarChar(100), data.ownerid || null)
            .input('ismanaged', sql.Bit, data.ismanaged ? 1 : 0)
            .input('iscustomizable', sql.Bit, data.iscustomizable === false ? 0 : 1)
            .input('status', sql.NVarChar(20), data.status || 'Active')
            .input('definitionjson', sql.NVarChar(sql.MAX), JSON.stringify(data.definition))
            .query(`
                DECLARE @entityId UNIQUEIDENTIFIER = (SELECT entityid FROM EntityMetadata WHERE logicalname = @entitylogicalname);
                IF @entityId IS NULL THROW 50001, 'Entity not found', 1;
                IF @isdefault = 1
                    UPDATE ViewMetadata SET isdefault = 0
                    WHERE entityid = @entityId
                      AND appid IS NULL;

                IF EXISTS (
                    SELECT 1 FROM ViewMetadata
                    WHERE entityid = @entityId
                      AND viewkey = @viewkey
                      AND appid IS NULL
                )
                BEGIN
                    UPDATE ViewMetadata
                    SET viewname = @viewname,
                        isdefault = @isdefault,
                        viewtype = @viewtype,
                        ownerid = @ownerid,
                        ismanaged = @ismanaged,
                        iscustomizable = @iscustomizable,
                        status = @status,
                        definitionjson = @definitionjson,
                        appid = NULL,
                        modifiedon = GETDATE()
                    WHERE entityid = @entityId
                      AND viewkey = @viewkey
                      AND appid IS NULL;

                    SELECT TOP 1 viewid FROM ViewMetadata
                    WHERE entityid = @entityId
                      AND viewkey = @viewkey
                      AND appid IS NULL;
                END
                ELSE
                BEGIN
                    INSERT INTO ViewMetadata (appid, entityid, viewkey, viewname, isdefault, viewtype, ownerid, ismanaged, iscustomizable, status, definitionjson)
                    OUTPUT INSERTED.viewid
                    VALUES (NULL, @entityId, @viewkey, @viewname, @isdefault, @viewtype, @ownerid, @ismanaged, @iscustomizable, @status, @definitionjson);
                END
            `);
        return result.recordset[0];
    }

    async getViewsForEntity(logicalName, data = {}) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('logicalname', sql.NVarChar(100), logicalName)
            .input('ownerid', sql.NVarChar(100), data?.ownerid || null)
            .query(`
                SELECT v.* FROM ViewMetadata v
                JOIN EntityMetadata e ON v.entityid = e.entityid
                WHERE e.logicalname = @logicalname
                  AND v.appid IS NULL
                  AND (v.viewtype <> 'Personal' OR v.ownerid = @ownerid)
                ORDER BY v.isdefault DESC, v.createdon DESC
            `);
        return result.recordset.map(r => ({ ...r, definition: JSON.parse(r.definitionjson) }));
    }

    async seedDefaultViews(logicalName, displayName, primaryNameAttr) {
        const defaultViews = [
            {
                viewkey: 'active',
                viewname: `Active ${displayName}s`,
                viewtype: 'System',
                isdefault: true,
                definition: { columns: [{ field: primaryNameAttr, label: primaryNameAttr, width: 200 }], filters: [], sorting: [] }
            },
            {
                viewkey: 'inactive',
                viewname: `Inactive ${displayName}s`,
                viewtype: 'System',
                isdefault: false,
                definition: { columns: [{ field: primaryNameAttr, label: primaryNameAttr, width: 200 }], filters: [{ field: 'statecode', operator: 'eq', value: 1 }], sorting: [] }
            },
            {
                viewkey: 'lookup',
                viewname: `${displayName} Lookup View`,
                viewtype: 'Lookup',
                isdefault: false,
                definition: { columns: [{ field: primaryNameAttr, label: primaryNameAttr, width: 200 }], filters: [], sorting: [] }
            }
        ];

        for (const view of defaultViews) {
            await this.saveView({
                entitylogicalname: logicalName,
                ...view,
                ismanaged: true,
                iscustomizable: true
            });
        }
    }

    async getDefaultView(logicalName) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('logicalname', sql.NVarChar(100), logicalName)
            .query(`
                SELECT TOP 1 v.* FROM ViewMetadata v
                JOIN EntityMetadata e ON v.entityid = e.entityid
                WHERE e.logicalname = @logicalname
                  AND v.appid IS NULL
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

    async getViewsForEntities(entityNames = []) {
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
                SELECT v.*, e.logicalname AS entitylogicalname
                FROM ViewMetadata v
                JOIN EntityMetadata e ON v.entityid = e.entityid
                WHERE e.logicalname IN (${params.join(', ')})
                  AND v.appid IS NULL
                ORDER BY v.isdefault DESC, v.createdon DESC
            `);
        return result.recordset.map((row) => ({ ...row, definition: JSON.parse(row.definitionjson) }));
    }

    async listAllViews() {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT v.*, e.logicalname AS entitylogicalname
            FROM ViewMetadata v
            JOIN EntityMetadata e ON v.entityid = e.entityid
            ORDER BY v.modifiedon DESC, v.createdon DESC
        `);
        return result.recordset.map((row) => ({ ...row, definition: JSON.parse(row.definitionjson) }));
    }
}

module.exports = new ViewRepository();

