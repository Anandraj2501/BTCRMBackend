const fs = require('fs');
const path = require('path');
const { poolPromise } = require('../config/db');

const migrationFiles = [
    path.join(__dirname, '../../database/migrations/001_add_relationship_form_view_tables.sql'),
    path.join(__dirname, '../../database/migrations/005_app_metadata_and_app_scoped_artifacts.sql'),
];
let ensureSchemaPromise = null;

function splitSqlBatches(script) {
    return script
        .split(/^\s*GO\s*$/im)
        .map((batch) => batch.trim())
        .filter(Boolean);
}

async function appMetadataTableExists(pool) {
    const result = await pool.request().query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_NAME IN ('AppMetadata', 'FormMetadata', 'ViewMetadata', 'RelationshipMetadata')
    `);

    const tableNames = new Set(result.recordset.map((row) => row.TABLE_NAME));

    return (
        tableNames.has('AppMetadata') &&
        tableNames.has('FormMetadata') &&
        tableNames.has('ViewMetadata') &&
        tableNames.has('RelationshipMetadata')
    );
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
