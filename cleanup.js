const { sql, poolPromise } = require('./src/db');

async function cleanup() {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT id, type, name FROM Components WHERE type = 'App'
    `);
    console.log("Current Apps:", result.recordset);
    
    // We want to keep valid ones like 'Field Sales', 'Order App', etc.
    const keepNames = ['Field Sales', 'Order App', 'AccountContact']; 
    // Wait, the user has 'accountcontact' in screenshot, maybe it's junk too.
    
    // Let's just delete anything that isn't 'Field Sales' or 'Order App'
    const junk = result.recordset.filter(app => !['Field Sales', 'Order App'].includes(app.name));
    
    for (let app of junk) {
      console.log('Deleting', app.name);
      await pool.request()
        .input('id', sql.UniqueIdentifier, app.id)
        .query(`DELETE FROM SolutionComponents WHERE componentid = @id`);
      await pool.request()
        .input('id', sql.UniqueIdentifier, app.id)
        .query(`DELETE FROM Components WHERE id = @id`);
    }
    
    console.log("Cleanup complete!");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

cleanup();
