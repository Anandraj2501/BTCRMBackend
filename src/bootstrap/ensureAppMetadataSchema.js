const fs = require('fs');
const path = require('path');
const { poolPromise } = require('../config/db');

const migrationFiles = [
    path.join(__dirname, '../../database/migrations/001_add_relationship_form_view_tables.sql'),
    path.join(__dirname, '../../database/migrations/005_app_metadata_and_app_scoped_artifacts.sql'),
    path.join(__dirname, '../../database/migrations/006_solution_storage.sql'),
    path.join(__dirname, '../../database/migrations/007_app_scoped_records.sql'),
    path.join(__dirname, '../../database/migrations/008_personal_views.sql'),
    path.join(__dirname, '../../database/migrations/009_advanced_views.sql'),
];
let ensureSchemaPromise = null;

function splitSqlBatches(script) {
    return script
        .split(/^\s*GO\s*$/im)
        .map((batch) => batch.trim())
        .filter(Boolean);
}

async function appMetadataTableExists(pool) {
    const verifyQuery = `
        SELECT 1 FROM sys.tables WHERE name = 'AppMetadata'
        UNION ALL
        SELECT 1 FROM sys.tables WHERE name = 'SolutionStorage'
        UNION ALL
        SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('BaseEntity') AND name = 'appid'
        UNION ALL
        SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ViewMetadata') AND name = 'viewtype'
        UNION ALL
        SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ViewMetadata') AND name = 'ownerid'
        UNION ALL
        SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('ViewMetadata') AND name = 'ismanaged'
    `;
    const verifyResult = await pool.request().query(verifyQuery);
    return verifyResult.recordset.length >= 6;
}

async function runMigrationFile(pool, filePath) {
    const script = fs.readFileSync(filePath, 'utf8');
    const batches = splitSqlBatches(script);

    for (const batch of batches) {
        await pool.request().batch(batch);
    }
}

async function ensureAppMetadataSchema() {
    if (!ensureSchemaPromise) {
        ensureSchemaPromise = (async () => {
            const pool = await poolPromise;
            const exists = await appMetadataTableExists(pool);

            if (exists) {
                return;
            }

            console.log('Studio metadata schema missing. Applying required migrations...');

            for (const filePath of migrationFiles) {
                console.log(`Applying migration: ${path.basename(filePath)}`);
                await runMigrationFile(pool, filePath);
            }

            console.log('Studio metadata schema ensured.');
        })().catch((error) => {
            ensureSchemaPromise = null;
            throw error;
        });
    }

    return ensureSchemaPromise;
}

module.exports = {
    ensureAppMetadataSchema,
};
