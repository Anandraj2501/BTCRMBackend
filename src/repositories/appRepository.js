const { sql, poolPromise } = require('../config/db');
const { ensureAppMetadataSchema } = require('../bootstrap/ensureAppMetadataSchema');

function parseJson(raw, fallback = null) {
    try {
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function mapRowToArtifact(row) {
    if (!row) return null;

    const draftPayload = parseJson(row.draftdefinitionjson, null);
    const publishedPayload = parseJson(row.publisheddefinitionjson, null);

    return {
        draft: draftPayload
            ? {
                version: row.draftversion,
                savedOn: row.modifiedon,
                payload: draftPayload,
            }
            : null,
        published: publishedPayload
            ? {
                version: row.publishedversion,
                publishedOn: row.modifiedon,
                payload: publishedPayload,
            }
            : null,
    };
}

class AppRepository {
    async listApps() {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT *
            FROM AppMetadata
            ORDER BY modifiedon DESC
        `);

        return result.recordset.map(mapRowToArtifact).filter(Boolean);
    }

    async getApp(appId) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('appid', sql.UniqueIdentifier, appId)
            .query(`SELECT * FROM AppMetadata WHERE appid = @appid`);

        return mapRowToArtifact(result.recordset[0] || null);
    }

    async saveDraftApp(app) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        const payload = JSON.stringify(app);

        await pool.request()
            .input('appid', sql.UniqueIdentifier, app.id)
            .input('appname', sql.NVarChar(255), app.name || 'Untitled App')
            .input('description', sql.NVarChar(sql.MAX), app.description || '')
            .input('apptype', sql.NVarChar(50), app.type || 'Model-driven')
            .input('ownername', sql.NVarChar(255), app.owner || 'Admin')
            .input('draftversion', sql.Int, app.draftVersion || 1)
            .input('draftdefinitionjson', sql.NVarChar(sql.MAX), payload)
            .query(`
                IF EXISTS (SELECT 1 FROM AppMetadata WHERE appid = @appid)
                BEGIN
                    UPDATE AppMetadata
                    SET
                        appname = @appname,
                        description = @description,
                        apptype = @apptype,
                        ownername = @ownername,
                        draftversion = @draftversion,
                        draftdefinitionjson = @draftdefinitionjson,
                        modifiedon = GETDATE()
                    WHERE appid = @appid;
                END
                ELSE
                BEGIN
                    INSERT INTO AppMetadata (
                        appid, appname, description, apptype, ownername,
                        draftversion, publishedversion, draftdefinitionjson, publisheddefinitionjson
                    )
                    VALUES (
                        @appid, @appname, @description, @apptype, @ownername,
                        @draftversion, 0, @draftdefinitionjson, NULL
                    );
                END
            `);

        return this.getApp(app.id);
    }

    async publishApp(appId) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        await pool.request()
            .input('appid', sql.UniqueIdentifier, appId)
            .query(`
                UPDATE AppMetadata
                SET
                    publisheddefinitionjson = draftdefinitionjson,
                    publishedversion = publishedversion + 1,
                    modifiedon = GETDATE()
                WHERE appid = @appid
            `);

        return this.getApp(appId);
    }

    async deleteApp(appId) {
        await ensureAppMetadataSchema();
        const pool = await poolPromise;
        // msnodesqlv8 does not support multiple statements in a single query,
        // so we send each DELETE as a separate request in dependency order.
        await pool.request()
            .input('appid', sql.UniqueIdentifier, appId)
            .query(`DELETE FROM FormMetadata WHERE appid = @appid`);

        await pool.request()
            .input('appid', sql.UniqueIdentifier, appId)
            .query(`DELETE FROM ViewMetadata WHERE appid = @appid`);

        await pool.request()
            .input('appid', sql.UniqueIdentifier, appId)
            .query(`DELETE FROM AppMetadata WHERE appid = @appid`);
    }
}

module.exports = new AppRepository();
