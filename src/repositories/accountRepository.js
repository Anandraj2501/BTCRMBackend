const { randomUUID } = require('crypto');
const { sql, poolPromise } = require('../config/db');
const auditLogRepository = require('./auditLogRepository');

const SORT_MAP = {
    name: 'a.name',
    accountNumber: 'a.accountnumber',
    email: 'a.email',
    phone: 'a.phone',
    status: 'b.statecode',
    modifiedOn: 'b.modifiedon',
    createdOn: 'b.createdon',
};

function toStatusCode(status) {
    return status === 'Inactive' ? 2 : 1;
}

function toStateCode(status) {
    return status === 'Inactive' ? 1 : 0;
}

function buildSort(sortBy, sortDirection) {
    const column = SORT_MAP[sortBy] || SORT_MAP.modifiedOn;
    const direction = String(sortDirection || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    return `${column} ${direction}`;
}

function baseSelect() {
    return `
        SELECT
            a.accountid,
            a.name,
            a.accountnumber,
            a.accounttype,
            a.email,
            a.phone,
            a.street,
            a.city,
            a.state,
            a.country,
            a.zip,
            b.ownerid,
            b.createdon,
            b.modifiedon,
            CASE WHEN b.statecode = 0 THEN 'Active' ELSE 'Inactive' END AS status
        FROM account a
        JOIN BaseEntity b ON a.baseentityid = b.baseentityid
    `;
}

class AccountRepository {
    async list(options = {}) {
        const pool = await poolPromise;
        const page = Number(options.page) > 0 ? Number(options.page) : 1;
        const pageSize = Math.min(Math.max(Number(options.pageSize) || 10, 1), 100);
        const offset = (page - 1) * pageSize;
        const search = String(options.search || '').trim();
        const status = String(options.status || '').trim();
        const where = [];
        const request = pool.request()
            .input('offset', sql.Int, offset)
            .input('pageSize', sql.Int, pageSize);

        if (search) {
            request.input('search', sql.NVarChar(255), `%${search}%`);
            where.push(`(
                a.name LIKE @search OR
                ISNULL(a.accountnumber, '') LIKE @search OR
                ISNULL(a.email, '') LIKE @search OR
                ISNULL(a.phone, '') LIKE @search
            )`);
        }

        if (status === 'Active' || status === 'Inactive') {
            request.input('statecode', sql.Int, status === 'Active' ? 0 : 1);
            where.push('b.statecode = @statecode');
        }

        const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const sortClause = buildSort(options.sortBy, options.sortDirection);
        const result = await request.query(`
            ${baseSelect()}
            ${whereClause}
            ORDER BY ${sortClause}
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;

            SELECT COUNT(1) AS totalcount
            FROM account a
            JOIN BaseEntity b ON a.baseentityid = b.baseentityid
            ${whereClause};
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

    async getById(accountId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('accountid', sql.UniqueIdentifier, accountId)
            .query(`
                ${baseSelect()}
                WHERE a.accountid = @accountid
            `);
        return result.recordset[0] || null;
    }

    async exists(accountId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('accountid', sql.UniqueIdentifier, accountId)
            .query(`SELECT TOP 1 1 AS found FROM account WHERE accountid = @accountid`);
        return result.recordset.length > 0;
    }

    async create(input, actor) {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const accountId = randomUUID();
            const baseEntityId = randomUUID();

            await new sql.Request(transaction)
                .input('baseentityid', sql.UniqueIdentifier, baseEntityId)
                .input('logicalname', sql.NVarChar(100), 'account')
                .input('ownerid', sql.UniqueIdentifier, actor.id)
                .input('statecode', sql.Int, toStateCode(input.status))
                .input('statuscode', sql.Int, toStatusCode(input.status))
                .query(`
                    INSERT INTO BaseEntity (
                        baseentityid, logicalname, ownerid, createdon, modifiedon, statecode, statuscode
                    )
                    VALUES (
                        @baseentityid, @logicalname, @ownerid, GETDATE(), GETDATE(), @statecode, @statuscode
                    )
                `);

            await new sql.Request(transaction)
                .input('accountid', sql.UniqueIdentifier, accountId)
                .input('baseentityid', sql.UniqueIdentifier, baseEntityId)
                .input('name', sql.NVarChar(200), input.name)
                .input('accountnumber', sql.NVarChar(100), input.accountNumber || `ACC-${Date.now()}`)
                .input('accounttype', sql.NVarChar(20), input.accountType)
                .input('email', sql.NVarChar(200), input.email)
                .input('phone', sql.NVarChar(50), input.phone)
                .input('street', sql.NVarChar(200), input.street)
                .input('city', sql.NVarChar(100), input.city)
                .input('state', sql.NVarChar(100), input.state)
                .input('country', sql.NVarChar(100), input.country)
                .input('zip', sql.NVarChar(20), input.zip)
                .query(`
                    INSERT INTO account (
                        accountid, baseentityid, name, accountnumber, accounttype, email, phone, street, city, state, country, zip
                    )
                    VALUES (
                        @accountid, @baseentityid, @name, @accountnumber, @accounttype, @email, @phone, @street, @city, @state, @country, @zip
                    )
                `);

            await auditLogRepository.writeLog(transaction, {
                entityName: 'account',
                recordId: accountId,
                action: 'Create',
                userId: actor.id,
                userRole: actor.role,
                changeData: input,
            });

            await transaction.commit();
            return this.getById(accountId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async update(accountId, input, actor) {
        const pool = await poolPromise;
        const existing = await this.getById(accountId);
        if (!existing) return null;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            await new sql.Request(transaction)
                .input('accountid', sql.UniqueIdentifier, accountId)
                .input('name', sql.NVarChar(200), input.name)
                .input('accountnumber', sql.NVarChar(100), input.accountNumber)
                .input('accounttype', sql.NVarChar(20), input.accountType)
                .input('email', sql.NVarChar(200), input.email)
                .input('phone', sql.NVarChar(50), input.phone)
                .input('street', sql.NVarChar(200), input.street)
                .input('city', sql.NVarChar(100), input.city)
                .input('state', sql.NVarChar(100), input.state)
                .input('country', sql.NVarChar(100), input.country)
                .input('zip', sql.NVarChar(20), input.zip)
                .query(`
                    UPDATE account
                    SET
                        name = @name,
                        accountnumber = @accountnumber,
                        accounttype = @accounttype,
                        email = @email,
                        phone = @phone,
                        street = @street,
                        city = @city,
                        state = @state,
                        country = @country,
                        zip = @zip
                    WHERE accountid = @accountid
                `);

            await new sql.Request(transaction)
                .input('accountid', sql.UniqueIdentifier, accountId)
                .input('statecode', sql.Int, toStateCode(input.status))
                .input('statuscode', sql.Int, toStatusCode(input.status))
                .query(`
                    UPDATE b
                    SET
                        modifiedon = GETDATE(),
                        statecode = @statecode,
                        statuscode = @statuscode
                    FROM BaseEntity b
                    JOIN account a ON a.baseentityid = b.baseentityid
                    WHERE a.accountid = @accountid
                `);

            await auditLogRepository.writeLog(transaction, {
                entityName: 'account',
                recordId: accountId,
                action: 'Update',
                userId: actor.id,
                userRole: actor.role,
                changeData: {
                    before: existing,
                    after: input,
                },
            });

            await transaction.commit();
            return this.getById(accountId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async hasContacts(accountId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('accountid', sql.UniqueIdentifier, accountId)
            .query(`SELECT COUNT(1) AS contactcount FROM contact WHERE parentaccountid = @accountid`);
        return (result.recordset[0]?.contactcount || 0) > 0;
    }

    async delete(accountId, actor) {
        const pool = await poolPromise;
        const existing = await this.getById(accountId);
        if (!existing) return false;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            await auditLogRepository.writeLog(transaction, {
                entityName: 'account',
                recordId: accountId,
                action: 'Delete',
                userId: actor.id,
                userRole: actor.role,
                changeData: existing,
            });

            await new sql.Request(transaction)
                .input('accountid', sql.UniqueIdentifier, accountId)
                .query(`
                    DECLARE @baseentityid UNIQUEIDENTIFIER = (
                        SELECT baseentityid FROM account WHERE accountid = @accountid
                    );

                    DELETE FROM account WHERE accountid = @accountid;

                    DELETE FROM BaseEntity WHERE baseentityid = @baseentityid;
                `);

            await transaction.commit();
            return true;
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = new AccountRepository();
