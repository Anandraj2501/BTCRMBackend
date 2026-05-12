const { randomUUID } = require('crypto');
const { sql, poolPromise } = require('../config/db');
const { ensureSolutionSchema } = require('../bootstrap/ensureSolutionSchema');

function parseJson(raw, fallback = {}) {
    try {
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function mapSolution(row) {
    if (!row) return null;
    return {
        id: row.id,
        displayName: row.displayname,
        uniqueName: row.uniquename,
        version: row.version,
        publisher: row.publisher,
        isManaged: row.ismanaged === true || row.ismanaged === 1,
        createdOn: row.createdon,
    };
}

function mapComponent(row) {
    if (!row) return null;
    return {
        id: row.id,
        componentId: row.id,
        type: row.type,
        name: row.name,
        logicalName: row.logicalname,
        metadata: parseJson(row.metadatajson, {}),
        createdOn: row.createdon,
    };
}

function mapSolutionComponent(row) {
    return {
        id: row.mappingid,
        solutionId: row.solutionid,
        componentId: row.componentid,
        type: row.componenttype,
        logicalName: row.logicalname,
        addedOn: row.addedon,
        isExisting: row.isexisting === true || row.isexisting === 1,
        component: mapComponent(row),
    };
}

class SolutionRepository {
    async listSolutions() {
        await ensureSolutionSchema();
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT s.*,
                   (SELECT COUNT(1) FROM SolutionComponents sc WHERE sc.solutionid = s.id) AS componentcount
            FROM Solutions s
            ORDER BY s.createdon DESC
        `);
        return result.recordset.map((row) => ({
            ...mapSolution(row),
            componentCount: row.componentcount,
        }));
    }

    async getSolution(solutionId) {
        await ensureSolutionSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('solutionid', sql.UniqueIdentifier, solutionId)
            .query(`SELECT * FROM Solutions WHERE id = @solutionid`);
        return mapSolution(result.recordset[0] || null);
    }

    async getSolutionByUniqueName(uniqueName) {
        await ensureSolutionSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('uniquename', sql.NVarChar(255), uniqueName)
            .query(`SELECT * FROM Solutions WHERE uniquename = @uniquename`);
        return mapSolution(result.recordset[0] || null);
    }

    async getSolutionComponents(solutionId) {
        await ensureSolutionSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('solutionid', sql.UniqueIdentifier, solutionId)
            .query(`
                SELECT
                    sc.id AS mappingid,
                    sc.solutionid,
                    sc.componentid,
                    sc.componenttype,
                    sc.addedon,
                    sc.isexisting,
                    c.id,
                    c.type,
                    c.name,
                    c.logicalname,
                    c.metadatajson,
                    c.createdon
                FROM SolutionComponents sc
                JOIN Components c ON c.id = sc.componentid
                WHERE sc.solutionid = @solutionid
                ORDER BY sc.addedon ASC
            `);
        return result.recordset.map(mapSolutionComponent);
    }

    async getSolutionComponentIds(solutionId) {
        await ensureSolutionSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('solutionid', sql.UniqueIdentifier, solutionId)
            .query(`SELECT componentid FROM SolutionComponents WHERE solutionid = @solutionid`);
        return result.recordset.map((row) => row.componentid);
    }

    async createSolution(input) {
        await ensureSolutionSchema();
        const pool = await poolPromise;
        const id = input.id || randomUUID();
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('displayname', sql.NVarChar(255), input.displayName)
            .input('uniquename', sql.NVarChar(255), input.uniqueName)
            .input('version', sql.NVarChar(50), input.version || '1.0.0.0')
            .input('publisher', sql.NVarChar(255), input.publisher || 'Default Publisher')
            .input('ismanaged', sql.Bit, input.isManaged ? 1 : 0)
            .query(`
                INSERT INTO Solutions (id, displayname, uniquename, version, publisher, ismanaged)
                VALUES (@id, @displayname, @uniquename, @version, @publisher, @ismanaged)
            `);
        return this.getSolution(id);
    }

    async upsertComponent(input) {
        await ensureSolutionSchema();
        const pool = await poolPromise;
        const id = input.id;
        await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .input('type', sql.NVarChar(50), input.type)
            .input('name', sql.NVarChar(255), input.name)
            .input('logicalname', sql.NVarChar(255), input.logicalName || null)
            .input('metadatajson', sql.NVarChar(sql.MAX), JSON.stringify(input.metadata || {}))
            .query(`
                IF EXISTS (SELECT 1 FROM Components WHERE id = @id)
                BEGIN
                    UPDATE Components
                    SET type = @type,
                        name = @name,
                        logicalname = @logicalname,
                        metadatajson = @metadatajson
                    WHERE id = @id;
                END
                ELSE
                BEGIN
                    INSERT INTO Components (id, type, name, logicalname, metadatajson)
                    VALUES (@id, @type, @name, @logicalname, @metadatajson);
                END
            `);
        return this.getComponent(id);
    }

    async getComponent(componentId) {
        await ensureSolutionSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('componentid', sql.UniqueIdentifier, componentId)
            .query(`SELECT * FROM Components WHERE id = @componentid`);
        return mapComponent(result.recordset[0] || null);
    }

    async listComponents(type = null) {
        await ensureSolutionSchema();
        const pool = await poolPromise;
        const request = pool.request();
        let query = `SELECT * FROM Components`;
        if (type) {
            request.input('type', sql.NVarChar(50), type);
            query += ` WHERE type = @type`;
        }
        query += ` ORDER BY type ASC, name ASC`;
        const result = await request.query(query);
        return result.recordset.map(mapComponent);
    }

    async addComponentReference(solutionId, input) {
        await ensureSolutionSchema();
        const pool = await poolPromise;
        const mappingId = input.id || randomUUID();
        await pool.request()
            .input('id', sql.UniqueIdentifier, mappingId)
            .input('solutionid', sql.UniqueIdentifier, solutionId)
            .input('componentid', sql.UniqueIdentifier, input.componentId)
            .input('componenttype', sql.NVarChar(50), input.type)
            .input('addedon', sql.DateTime, input.addedOn ? new Date(input.addedOn) : new Date())
            .input('isexisting', sql.Bit, input.isExisting ? 1 : 0)
            .query(`
                INSERT INTO SolutionComponents (id, solutionid, componentid, componenttype, addedon, isexisting)
                VALUES (@id, @solutionid, @componentid, @componenttype, @addedon, @isexisting)
            `);
        return mappingId;
    }

    async removeComponentReference(solutionId, componentId) {
        await ensureSolutionSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('solutionid', sql.UniqueIdentifier, solutionId)
            .input('componentid', sql.UniqueIdentifier, componentId)
            .query(`
                DELETE FROM SolutionComponents
                WHERE solutionid = @solutionid AND componentid = @componentid
            `);
        return result.rowsAffected?.[0] > 0;
    }

    async deleteSolution(solutionId) {
        await ensureSolutionSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('solutionid', sql.UniqueIdentifier, solutionId)
            .query(`DELETE FROM Solutions WHERE id = @solutionid`);
        return result.rowsAffected?.[0] > 0;
    }

    async deleteComponentGlobally(componentId) {
        await ensureSolutionSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('componentid', sql.UniqueIdentifier, componentId)
            .query(`DELETE FROM Components WHERE id = @componentid`);
        return result.rowsAffected?.[0] > 0;
    }

    async solutionHasComponent(solutionId, componentId) {
        await ensureSolutionSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('solutionid', sql.UniqueIdentifier, solutionId)
            .input('componentid', sql.UniqueIdentifier, componentId)
            .query(`
                SELECT TOP 1 1 AS found
                FROM SolutionComponents
                WHERE solutionid = @solutionid AND componentid = @componentid
            `);
        return result.recordset.length > 0;
    }

    async getSolutionsByComponent(componentId) {
        await ensureSolutionSchema();
        const pool = await poolPromise;
        const result = await pool.request()
            .input('componentid', sql.UniqueIdentifier, componentId)
            .query(`
                SELECT s.*
                FROM Solutions s
                JOIN SolutionComponents sc ON s.id = sc.solutionid
                WHERE sc.componentid = @componentid
                ORDER BY s.createdon DESC
            `);
        return result.recordset.map(mapSolution);
    }
}

module.exports = new SolutionRepository();
