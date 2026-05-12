const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { sql, poolPromise } = require('../config/db');
const { ensureAppMetadataSchema } = require('./ensureAppMetadataSchema');

const migrationFiles = [
    path.join(__dirname, '../../database/migrations/006_solution_storage.sql'),
];
const legacyStorePath = path.join(__dirname, '../../data/solutions-store.json');
let ensureSolutionSchemaPromise = null;

function splitSqlBatches(script) {
    return script
        .split(/^\s*GO\s*$/im)
        .map((batch) => batch.trim())
        .filter(Boolean);
}

function normalizeLegacyStore(rawStore) {
    if (Array.isArray(rawStore?.solutions) && rawStore.solutions.every((solution) => Array.isArray(solution.components))) {
        return rawStore;
    }

    const componentMap = new Map((rawStore?.components || []).map((component) => [component.id, component]));
    const refsBySolution = new Map();

    for (const reference of rawStore?.solutionComponents || []) {
        const component = componentMap.get(reference.componentId);
        const list = refsBySolution.get(reference.solutionId) || [];
        list.push({
            componentId: reference.componentId,
            type: reference.type || component?.type,
            logicalName: component?.metadata?.logicalName || component?.name || null,
            isExisting: Boolean(reference.isExisting),
            addedOn: reference.addedOn || new Date().toISOString(),
            name: component?.name || null,
            metadata: component?.metadata || {},
        });
        refsBySolution.set(reference.solutionId, list);
    }

    return {
        solutions: (rawStore?.solutions || []).map((solution) => ({
            ...solution,
            components: refsBySolution.get(solution.id) || [],
        })),
    };
}

function readLegacyStore() {
    if (!fs.existsSync(legacyStorePath)) {
        return { solutions: [] };
    }

    return normalizeLegacyStore(JSON.parse(fs.readFileSync(legacyStorePath, 'utf8')));
}

async function runMigrationFile(pool, filePath) {
    const script = fs.readFileSync(filePath, 'utf8');
    const batches = splitSqlBatches(script);

    for (const batch of batches) {
        await pool.request().batch(batch);
    }
}

async function solutionTablesExist(pool) {
    const result = await pool.request().query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME IN ('Solutions', 'Components', 'SolutionComponents')
    `);
    const names = new Set(result.recordset.map((row) => row.TABLE_NAME));
    return names.has('Solutions') && names.has('Components') && names.has('SolutionComponents');
}

async function syncSqlBackedComponents(pool) {
    const records = [];

    const apps = await pool.request().query(`
        SELECT appid AS id, appname AS displayname, ownername, modifiedon, createdon, apptype
        FROM AppMetadata
    `);
    for (const app of apps.recordset) {
        records.push({
            id: app.id,
            type: 'App',
            name: app.displayname || 'Untitled App',
            logicalName: String(app.displayname || app.id).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
            metadata: {
                owner: app.ownername || 'Admin',
                status: 'Draft',
                customized: 'Yes',
                managed: 'No',
                lastModified: app.modifiedon || app.createdon,
                source: 'AppMetadata',
                appType: app.apptype || 'Model-driven',
            },
            createdOn: app.createdon || new Date().toISOString(),
        });
    }

    const entities = await pool.request().query(`
        SELECT entityid AS id, logicalname, displayname, iscustomentity, modifiedon, createdon
        FROM EntityMetadata
    `);
    for (const entity of entities.recordset) {
        records.push({
            id: entity.id,
            type: 'Table',
            name: entity.displayname || entity.logicalname,
            logicalName: entity.logicalname,
            metadata: {
                owner: 'System',
                status: entity.iscustomentity ? 'Custom' : 'Standard',
                customized: entity.iscustomentity ? 'Yes' : 'No',
                managed: 'No',
                lastModified: entity.modifiedon || entity.createdon,
                source: 'EntityMetadata',
            },
            createdOn: entity.createdon || new Date().toISOString(),
        });
    }

    const forms = await pool.request().query(`
        SELECT formid AS id, formname, formkey, modifiedon, createdon
        FROM FormMetadata
    `);
    for (const form of forms.recordset) {
        records.push({
            id: form.id,
            type: 'Form',
            name: form.formname,
            logicalName: form.formkey || String(form.formname || form.id).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
            metadata: {
                owner: 'System',
                status: 'Draft',
                customized: 'Yes',
                managed: 'No',
                lastModified: form.modifiedon || form.createdon,
                source: 'FormMetadata',
            },
            createdOn: form.createdon || new Date().toISOString(),
        });
    }

    const views = await pool.request().query(`
        SELECT viewid AS id, viewname, viewkey, modifiedon, createdon
        FROM ViewMetadata
    `);
    for (const view of views.recordset) {
        records.push({
            id: view.id,
            type: 'View',
            name: view.viewname,
            logicalName: view.viewkey || String(view.viewname || view.id).trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
            metadata: {
                owner: 'System',
                status: 'Draft',
                customized: 'Yes',
                managed: 'No',
                lastModified: view.modifiedon || view.createdon,
                source: 'ViewMetadata',
            },
            createdOn: view.createdon || new Date().toISOString(),
        });
    }

    for (const record of records) {
        await pool.request()
            .input('id', sql.UniqueIdentifier, record.id)
            .input('type', sql.NVarChar(50), record.type)
            .input('name', sql.NVarChar(255), record.name)
            .input('logicalname', sql.NVarChar(255), record.logicalName)
            .input('metadatajson', sql.NVarChar(sql.MAX), JSON.stringify(record.metadata || {}))
            .input('createdon', sql.DateTime, new Date(record.createdOn))
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
                    INSERT INTO Components (id, type, name, logicalname, metadatajson, createdon)
                    VALUES (@id, @type, @name, @logicalname, @metadatajson, @createdon);
                END
            `);
    }
}

async function migrateLegacySolutions(pool) {
    const store = readLegacyStore();

    for (const solution of store.solutions || []) {
        await pool.request()
            .input('id', sql.UniqueIdentifier, solution.id)
            .input('displayname', sql.NVarChar(255), solution.displayName)
            .input('uniquename', sql.NVarChar(255), solution.uniqueName)
            .input('version', sql.NVarChar(50), solution.version || '1.0.0.0')
            .input('publisher', sql.NVarChar(255), solution.publisher || 'Default Publisher')
            .input('ismanaged', sql.Bit, solution.isManaged ? 1 : 0)
            .input('createdon', sql.DateTime, new Date(solution.createdOn || new Date().toISOString()))
            .query(`
                IF NOT EXISTS (SELECT 1 FROM Solutions WHERE id = @id)
                BEGIN
                    INSERT INTO Solutions (id, displayname, uniquename, version, publisher, ismanaged, createdon)
                    VALUES (@id, @displayname, @uniquename, @version, @publisher, @ismanaged, @createdon);
                END
            `);

        for (const component of solution.components || []) {
            const componentId = component.componentId || component.id;
            if (!componentId) {
                continue;
            }

            const metadata = component.metadata || {};
            const name = component.name || component.logicalName || component.type || String(componentId);
            const logicalName = component.logicalName || component.name || null;

            await pool.request()
                .input('id', sql.UniqueIdentifier, componentId)
                .input('type', sql.NVarChar(50), component.type || 'Unknown')
                .input('name', sql.NVarChar(255), name)
                .input('logicalname', sql.NVarChar(255), logicalName)
                .input('metadatajson', sql.NVarChar(sql.MAX), JSON.stringify(metadata))
                .input('createdon', sql.DateTime, new Date(component.addedOn || solution.createdOn || new Date().toISOString()))
                .query(`
                    IF NOT EXISTS (SELECT 1 FROM Components WHERE id = @id)
                    BEGIN
                        INSERT INTO Components (id, type, name, logicalname, metadatajson, createdon)
                        VALUES (@id, @type, @name, @logicalname, @metadatajson, @createdon);
                    END
                `);

            await pool.request()
                .input('id', sql.UniqueIdentifier, randomUUID())
                .input('solutionid', sql.UniqueIdentifier, solution.id)
                .input('componentid', sql.UniqueIdentifier, componentId)
                .input('componenttype', sql.NVarChar(50), component.type || 'Unknown')
                .input('addedon', sql.DateTime, new Date(component.addedOn || solution.createdOn || new Date().toISOString()))
                .input('isexisting', sql.Bit, component.isExisting ? 1 : 0)
                .query(`
                    IF NOT EXISTS (
                        SELECT 1
                        FROM SolutionComponents
                        WHERE solutionid = @solutionid AND componentid = @componentid
                    )
                    BEGIN
                        INSERT INTO SolutionComponents (id, solutionid, componentid, componenttype, addedon, isexisting)
                        VALUES (@id, @solutionid, @componentid, @componenttype, @addedon, @isexisting);
                    END
                `);
        }
    }
}

async function ensureSolutionSchema() {
    if (!ensureSolutionSchemaPromise) {
        ensureSolutionSchemaPromise = (async () => {
            await ensureAppMetadataSchema();
            const pool = await poolPromise;
            const exists = await solutionTablesExist(pool);

            if (!exists) {
                console.log('Solution schema missing. Applying required migrations...');
                for (const filePath of migrationFiles) {
                    console.log(`Applying migration: ${path.basename(filePath)}`);
                    await runMigrationFile(pool, filePath);
                }
                console.log('Solution schema ensured.');
            }

            await syncSqlBackedComponents(pool);
            await migrateLegacySolutions(pool);
        })().catch((error) => {
            ensureSolutionSchemaPromise = null;
            throw error;
        });
    }

    return ensureSolutionSchemaPromise;
}

module.exports = {
    ensureSolutionSchema,
};
