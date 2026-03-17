const sql = require('mssql/msnodesqlv8');
const fs = require('fs');
const path = require('path');

const connectionString = 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=MiniCRM;Trusted_Connection=yes;TrustServerCertificate=yes;';

async function runMigrations() {
    let pool;
    try {
        pool = await new sql.ConnectionPool({ connectionString }).connect();
        console.log('Connected to SQL Server');

        const migrationsDir = path.join(__dirname, 'database', 'migrations');
        const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

        for (const file of files) {
            const filePath = path.join(migrationsDir, file);
            const sqlContent = fs.readFileSync(filePath, 'utf8');
            
            // Split on GO statements
            const batches = sqlContent.split(/^\s*GO\s*$/im).filter(b => b.trim());
            
            console.log(`\nRunning migration: ${file}`);
            for (const batch of batches) {
                if (batch.trim()) {
                    await pool.request().query(batch);
                }
            }
            console.log(`✓ ${file} done`);
        }
        console.log('\nAll migrations completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    } finally {
        if (pool) await pool.close();
    }
}

runMigrations();
