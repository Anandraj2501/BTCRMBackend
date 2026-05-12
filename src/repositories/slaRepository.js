const { randomUUID } = require('crypto');
const { sql, poolPromise } = require('../config/db');

class SlaRepository {
    async createSla(input) {
        const pool = await poolPromise;
        const slaId = randomUUID();
        await pool.request()
            .input('slaid', sql.UniqueIdentifier, slaId)
            .input('name', sql.NVarChar(200), input.name)
            .input('applicableentity', sql.NVarChar(50), 'Case')
            .input('isdefault', sql.Bit, input.isDefault ? 1 : 0)
            .input('status', sql.NVarChar(20), input.status || 'Active')
            .query(`
                IF @isdefault = 1
                BEGIN
                    UPDATE dbo.SLAs SET IsDefault = 0 WHERE ApplicableEntity = 'Case';
                END;

                INSERT INTO dbo.SLAs (SLAId, Name, ApplicableEntity, IsDefault, Status)
                VALUES (@slaid, @name, @applicableentity, @isdefault, @status);
            `);
        return this.getSlaById(slaId);
    }

    async createSlaItem(input) {
        const pool = await poolPromise;
        const slaItemId = randomUUID();
        await pool.request()
            .input('slaitemid', sql.UniqueIdentifier, slaItemId)
            .input('slaid', sql.UniqueIdentifier, input.slaId)
            .input('name', sql.NVarChar(200), input.name)
            .input('applicablewhen', sql.NVarChar(sql.MAX), JSON.stringify(input.applicableWhen || {}))
            .input('firstresponsetime', sql.Int, input.firstResponseTime)
            .input('resolutiontime', sql.Int, input.resolutionTime)
            .input('sortorder', sql.Int, input.sortOrder || 0)
            .query(`
                INSERT INTO dbo.SLA_Items (
                    SLAItemId, SLAId, Name, ApplicableWhen, FirstResponseTime, ResolutionTime, SortOrder
                )
                VALUES (
                    @slaitemid, @slaid, @name, @applicablewhen, @firstresponsetime, @resolutiontime, @sortorder
                );
            `);
        return this.getSlaItemById(slaItemId);
    }

    async createEntitlement(input) {
        const pool = await poolPromise;
        const entitlementId = randomUUID();
        await pool.request()
            .input('entitlementid', sql.UniqueIdentifier, entitlementId)
            .input('accountid', sql.UniqueIdentifier, input.accountId)
            .input('slaid', sql.UniqueIdentifier, input.slaId)
            .input('startdate', sql.DateTime2, input.startDate)
            .input('enddate', sql.DateTime2, input.endDate)
            .input('status', sql.NVarChar(20), input.status || 'Active')
            .query(`
                INSERT INTO dbo.Entitlements (EntitlementId, AccountId, SLAId, StartDate, EndDate, Status)
                VALUES (@entitlementid, @accountid, @slaid, @startdate, @enddate, @status);
            `);
        return this.getEntitlementById(entitlementId);
    }

    async getSlaById(slaId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('slaid', sql.UniqueIdentifier, slaId)
            .query('SELECT * FROM dbo.SLAs WHERE SLAId = @slaid');
        return result.recordset[0] || null;
    }

    async getSlaItemById(slaItemId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('slaitemid', sql.UniqueIdentifier, slaItemId)
            .query('SELECT * FROM dbo.SLA_Items WHERE SLAItemId = @slaitemid');
        return result.recordset[0] || null;
    }

    async getEntitlementById(entitlementId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('entitlementid', sql.UniqueIdentifier, entitlementId)
            .query('SELECT * FROM dbo.Entitlements WHERE EntitlementId = @entitlementid');
        return result.recordset[0] || null;
    }

    async getActiveEntitlementForAccount(accountId, atDate) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('accountid', sql.UniqueIdentifier, accountId)
            .input('atdate', sql.DateTime2, atDate)
            .query(`
                SELECT TOP 1 e.*, s.Name AS SLAName
                FROM dbo.Entitlements e
                JOIN dbo.SLAs s ON s.SLAId = e.SLAId
                WHERE e.AccountId = @accountid
                  AND e.Status = 'Active'
                  AND s.Status = 'Active'
                  AND @atdate >= e.StartDate
                  AND @atdate <= e.EndDate
                ORDER BY e.EndDate DESC;
            `);
        return result.recordset[0] || null;
    }

    async getDefaultSla() {
        const pool = await poolPromise;
        const result = await pool.request().query(`
            SELECT TOP 1 *
            FROM dbo.SLAs
            WHERE ApplicableEntity = 'Case' AND IsDefault = 1 AND Status = 'Active'
            ORDER BY CreatedOn DESC;
        `);
        return result.recordset[0] || null;
    }

    async getSlaItems(slaId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('slaid', sql.UniqueIdentifier, slaId)
            .query(`
                SELECT *
                FROM dbo.SLA_Items
                WHERE SLAId = @slaid
                ORDER BY SortOrder ASC, CreatedOn ASC;
            `);
        return result.recordset;
    }
}

module.exports = new SlaRepository();
