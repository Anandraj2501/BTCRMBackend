const { randomUUID } = require('crypto');
const { sql, poolPromise } = require('../config/db');

function baseSelect() {
    return `
        SELECT
            c.CaseId,
            c.Title,
            c.Description,
            c.TicketNumber,
            c.Priority,
            c.Status,
            c.AccountId,
            a.name AS AccountName,
            a.accounttype AS AccountType,
            c.ContactId,
            ct.fullname AS ContactName,
            c.SLAId,
            s.Name AS SLAName,
            c.FirstResponseDueDate,
            c.ResolutionDueDate,
            c.FirstResponseActualTime,
            c.ResolutionActualTime,
            c.SLAStatus,
            c.CreatedOn,
            c.ModifiedOn
        FROM dbo.Cases c
        JOIN dbo.account a ON a.accountid = c.AccountId
        LEFT JOIN dbo.contact ct ON ct.contactid = c.ContactId
        LEFT JOIN dbo.SLAs s ON s.SLAId = c.SLAId
    `;
}

class CaseRepository {
    async create(input, slaResult) {
        const pool = await poolPromise;
        const caseId = randomUUID();
        const ticketNumber = `CAS-${Date.now()}`;
        await pool.request()
            .input('caseid', sql.UniqueIdentifier, caseId)
            .input('title', sql.NVarChar(200), input.title)
            .input('description', sql.NVarChar(sql.MAX), input.description)
            .input('ticketnumber', sql.NVarChar(100), ticketNumber)
            .input('priority', sql.NVarChar(20), input.priority)
            .input('status', sql.NVarChar(20), input.status || 'Active')
            .input('accountid', sql.UniqueIdentifier, input.accountId)
            .input('contactid', sql.UniqueIdentifier, input.contactId)
            .input('slaid', sql.UniqueIdentifier, slaResult.slaId)
            .input('firstresponseduedate', sql.DateTime2, slaResult.firstResponseDueDate)
            .input('resolutionduedate', sql.DateTime2, slaResult.resolutionDueDate)
            .query(`
                INSERT INTO dbo.Cases (
                    CaseId, Title, Description, TicketNumber, Priority, Status, AccountId, ContactId,
                    SLAId, FirstResponseDueDate, ResolutionDueDate, SLAStatus, CreatedOn, ModifiedOn
                )
                VALUES (
                    @caseid, @title, @description, @ticketnumber, @priority, @status, @accountid, @contactid,
                    @slaid, @firstresponseduedate, @resolutionduedate, 'InProgress', GETDATE(), GETDATE()
                );
            `);
        return this.getById(caseId);
    }

    async getById(caseId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('caseid', sql.UniqueIdentifier, caseId)
            .query(`${baseSelect()} WHERE c.CaseId = @caseid`);
        return result.recordset[0] || null;
    }

    async list(options = {}) {
        const pool = await poolPromise;
        const page = Number(options.page) > 0 ? Number(options.page) : 1;
        const pageSize = Math.min(Math.max(Number(options.pageSize) || 25, 1), 100);
        const offset = (page - 1) * pageSize;
        const result = await pool.request()
            .input('offset', sql.Int, offset)
            .input('pageSize', sql.Int, pageSize)
            .query(`
                ${baseSelect()}
                ORDER BY c.CreatedOn DESC
                OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;

                SELECT COUNT(1) AS totalcount FROM dbo.Cases;
            `);
        const totalCount = result.recordsets[1]?.[0]?.totalcount || 0;
        return {
            items: result.recordsets[0] || [],
            page,
            pageSize,
            totalCount,
            totalPages: totalCount > 0 ? Math.ceil(totalCount / pageSize) : 1,
        };
    }

    async markBreached(now = new Date()) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('now', sql.DateTime2, now)
            .query(`
                UPDATE dbo.Cases
                SET SLAStatus = 'Failed', ModifiedOn = GETDATE()
                WHERE Status = 'Active'
                  AND SLAStatus = 'InProgress'
                  AND (
                    (FirstResponseActualTime IS NULL AND FirstResponseDueDate < @now)
                    OR (ResolutionActualTime IS NULL AND ResolutionDueDate < @now)
                  );

                SELECT @@ROWCOUNT AS breachedCount;
            `);
        return result.recordset[0]?.breachedCount || 0;
    }

    async recordFirstResponse(caseId, actualTime = new Date()) {
        const pool = await poolPromise;
        await pool.request()
            .input('caseid', sql.UniqueIdentifier, caseId)
            .input('actualtime', sql.DateTime2, actualTime)
            .query(`
                UPDATE dbo.Cases
                SET
                    FirstResponseActualTime = @actualtime,
                    SLAStatus = CASE
                        WHEN FirstResponseDueDate IS NOT NULL AND @actualtime > FirstResponseDueDate THEN 'Failed'
                        ELSE SLAStatus
                    END,
                    ModifiedOn = GETDATE()
                WHERE CaseId = @caseid;
            `);
        return this.getById(caseId);
    }

    async resolve(caseId, actualTime = new Date()) {
        const pool = await poolPromise;
        await pool.request()
            .input('caseid', sql.UniqueIdentifier, caseId)
            .input('actualtime', sql.DateTime2, actualTime)
            .query(`
                UPDATE dbo.Cases
                SET
                    Status = 'Resolved',
                    ResolutionActualTime = @actualtime,
                    FirstResponseActualTime = COALESCE(FirstResponseActualTime, @actualtime),
                    SLAStatus = CASE
                        WHEN ResolutionDueDate IS NOT NULL AND @actualtime <= ResolutionDueDate
                             AND (FirstResponseDueDate IS NULL OR COALESCE(FirstResponseActualTime, @actualtime) <= FirstResponseDueDate)
                            THEN 'Succeeded'
                        ELSE 'Failed'
                    END,
                    ModifiedOn = GETDATE()
                WHERE CaseId = @caseid;
            `);
        return this.getById(caseId);
    }
}

module.exports = new CaseRepository();
