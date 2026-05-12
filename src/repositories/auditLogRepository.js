const { randomUUID } = require('crypto');
const { sql } = require('../config/db');

function createRequest(connection) {
    return new sql.Request(connection);
}

class AuditLogRepository {
    async writeLog(connection, payload) {
        await createRequest(connection)
            .input('auditlogid', sql.UniqueIdentifier, randomUUID())
            .input('entityname', sql.NVarChar(100), payload.entityName)
            .input('recordid', sql.UniqueIdentifier, payload.recordId)
            .input('action', sql.NVarChar(50), payload.action)
            .input('userid', sql.UniqueIdentifier, payload.userId || null)
            .input('userrole', sql.NVarChar(50), payload.userRole || null)
            .input('changedata', sql.NVarChar(sql.MAX), JSON.stringify(payload.changeData || {}))
            .query(`
                INSERT INTO AuditLog (auditlogid, entityname, recordid, action, userid, userrole, changedata, createdon)
                VALUES (@auditlogid, @entityname, @recordid, @action, @userid, @userrole, @changedata, GETDATE())
            `);
    }
}

module.exports = new AuditLogRepository();
