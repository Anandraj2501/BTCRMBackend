const { sql, poolPromise } = require('./src/config/db');

const getMetadata = async () => {
    try {
        const pool = await poolPromise;
        const entities = await pool.request().query("SELECT logicalname, entityid FROM EntityMetadata");
        console.log("Entities:", entities.recordset);

        const attributes = await pool.request().query("SELECT logicalname, attributetype, entityid FROM AttributeMetadata");
        console.log("\nAttributes:");
        attributes.recordset.forEach(a => console.log(`- ${a.logicalname} (${a.attributetype}) on entity ${a.entityid}`));

        const lookups = await pool.request().query("SELECT * FROM LookupMetadata");
        console.log("\nLookups:", lookups.recordset);
        
        process.exit(0);
    } catch(e) {
        console.error(e);
        process.exit(1);
    }
}
getMetadata();
