require('dotenv').config();
const sql = require('mssql/msnodesqlv8'); // Use msnodesqlv8 driver

const connectionString = 'Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=MiniCRM;Trusted_Connection=yes;TrustServerCertificate=yes;';

const poolPromise = new sql.ConnectionPool({ connectionString })
  .connect()
  .then(pool => {
    console.log('Connected to SQL Server');
    return pool;
  })
  .catch(err => {
    console.error('Database Connection Failed! Bad Config: ', err);
    process.exit(1);
  });

module.exports = {
  sql, poolPromise
};
