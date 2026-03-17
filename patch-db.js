const { poolPromise } = require('./src/db');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const pool = await poolPromise;
        const sqlPath = path.join(__dirname, 'database', 'stored_procedures.sql');
        const sqlScript = fs.readFileSync(sqlPath, 'utf8');

        // Split by GO since mssql npm client does not support GO
        const batches = sqlScript.split('GO').map(b => b.trim()).filter(b => b.length > 0);
        
        for (const batch of batches) {
             await pool.request().query(batch);
        }
        console.log("Updated stored procedures successfully.");

        // Fix the 'Project' entity manually since it was already created WITHOUT the baseentityid metadata
        const projectRes = await pool.request().query(`SELECT top 1 entityid FROM EntityMetadata WHERE logicalname='project'`);
        if(projectRes.recordset.length > 0) {
             const projId = projectRes.recordset[0].entityid;
             const existingAttr = await pool.request().query(`SELECT * FROM AttributeMetadata WHERE entityid = '${projId}' and logicalname='baseentityid'`);
             if(existingAttr.recordset.length === 0) {
                 await pool.request().query(`
                     INSERT INTO AttributeMetadata (
                        attributeid, entityid, logicalname, displayname, schemaname,
                        attributetype, maxlength, isnullable, isprimaryname, createdon
                    )
                    VALUES (
                        NEWID(), '${projId}', 'baseentityid', 'Base Entity Identifier',
                        'BaseEntityId', 'Uniqueidentifier', NULL, 0, 0, GETDATE()
                    )
                 `);
                 console.log("Fixed 'Project' entity missing baseentityid metadata");
             }
        }

    } catch(err) {
        console.error(err);
    } finally {
        process.exit();
    }
}
run();
