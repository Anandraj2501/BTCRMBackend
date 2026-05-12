const { randomUUID } = require('crypto');
const { sql, poolPromise } = require('../config/db');
const auditLogRepository = require('./auditLogRepository');

const SORT_MAP = {
    fullName: 'c.fullname',
    email: 'c.email',
    phone: 'c.phone',
    jobTitle: 'c.jobtitle',
    parentAccountName: 'a.name',
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
            c.contactid,
            c.firstname,
            c.lastname,
            c.fullname,
            c.email,
            c.phone,
            c.parentaccountid,
            c.jobtitle,
            a.name AS parentaccountname,
            b.ownerid,
            b.createdon,
            b.modifiedon,
            CASE WHEN b.statecode = 0 THEN 'Active' ELSE 'Inactive' END AS status
        FROM contact c
        JOIN BaseEntity b ON c.baseentityid = b.baseentityid
        LEFT JOIN account a ON c.parentaccountid = a.accountid
    `;
}

class ContactRepository {
    async list(options = {}) {
        const pool = await poolPromise;
        const page = Number(options.page) > 0 ? Number(options.page) : 1;
        const pageSize = Math.min(Math.max(Number(options.pageSize) || 10, 1), 100);
        const offset = (page - 1) * pageSize;
        const search = String(options.search || '').trim();
        const status = String(options.status || '').trim();
        const accountId = String(options.accountId || '').trim();
        const where = [];
        const request = pool.request()
            .input('offset', sql.Int, offset)
            .input('pageSize', sql.Int, pageSize);

        if (search) {
            request.input('search', sql.NVarChar(255), `%${search}%`);
            where.push(`(
                c.fullname LIKE @search OR
                ISNULL(c.email, '') LIKE @search OR
                ISNULL(c.phone, '') LIKE @search OR
                ISNULL(c.jobtitle, '') LIKE @search OR
                ISNULL(a.name, '') LIKE @search
            )`);
        }

        if (status === 'Active' || status === 'Inactive') {
            request.input('statecode', sql.Int, status === 'Active' ? 0 : 1);
            where.push('b.statecode = @statecode');
        }

        if (accountId) {
            request.input('accountid', sql.UniqueIdentifier, accountId);
            where.push('c.parentaccountid = @accountid');
        }

        const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
        const sortClause = buildSort(options.sortBy, options.sortDirection);
        const result = await request.query(`
            ${baseSelect()}
            ${whereClause}
            ORDER BY ${sortClause}
            OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY;

            SELECT COUNT(1) AS totalcount
            FROM contact c
            JOIN BaseEntity b ON c.baseentityid = b.baseentityid
            LEFT JOIN account a ON c.parentaccountid = a.accountid
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

    async getById(contactId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('contactid', sql.UniqueIdentifier, contactId)
            .query(`
                ${baseSelect()}
                WHERE c.contactid = @contactid
            `);
        return result.recordset[0] || null;
    }

    async create(input, actor) {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const contactId = randomUUID();
            const baseEntityId = randomUUID();

            await new sql.Request(transaction)
                .input('baseentityid', sql.UniqueIdentifier, baseEntityId)
                .input('logicalname', sql.NVarChar(100), 'contact')
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
                .input('contactid', sql.UniqueIdentifier, contactId)
                .input('baseentityid', sql.UniqueIdentifier, baseEntityId)
                .input('firstname', sql.NVarChar(100), input.firstName)
                .input('lastname', sql.NVarChar(100), input.lastName || '')
                .input('email', sql.NVarChar(200), input.email)
                .input('phone', sql.NVarChar(50), input.phone)
                .input('parentaccountid', sql.UniqueIdentifier, input.parentAccountId)
                .input('jobtitle', sql.NVarChar(100), input.jobTitle)
                .query(`
                    INSERT INTO contact (
                        contactid, baseentityid, firstname, lastname, email, phone, parentaccountid, jobtitle
                    )
                    VALUES (
                        @contactid, @baseentityid, @firstname, @lastname, @email, @phone, @parentaccountid, @jobtitle
                    )
                `);

            await auditLogRepository.writeLog(transaction, {
                entityName: 'contact',
                recordId: contactId,
                action: 'Create',
                userId: actor.id,
                userRole: actor.role,
                changeData: input,
            });

            await transaction.commit();
            return this.getById(contactId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async update(contactId, input, actor) {
        const pool = await poolPromise;
        const existing = await this.getById(contactId);
        if (!existing) return null;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            await new sql.Request(transaction)
                .input('contactid', sql.UniqueIdentifier, contactId)
                .input('firstname', sql.NVarChar(100), input.firstName)
                .input('lastname', sql.NVarChar(100), input.lastName || '')
                .input('email', sql.NVarChar(200), input.email)
                .input('phone', sql.NVarChar(50), input.phone)
                .input('parentaccountid', sql.UniqueIdentifier, input.parentAccountId)
                .input('jobtitle', sql.NVarChar(100), input.jobTitle)
                .query(`
                    UPDATE contact
                    SET
                        firstname = @firstname,
                        lastname = @lastname,
                        email = @email,
                        phone = @phone,
                        parentaccountid = @parentaccountid,
                        jobtitle = @jobtitle
                    WHERE contactid = @contactid
                `);

            await new sql.Request(transaction)
                .input('contactid', sql.UniqueIdentifier, contactId)
                .input('statecode', sql.Int, toStateCode(input.status))
                .input('statuscode', sql.Int, toStatusCode(input.status))
                .query(`
                    UPDATE b
                    SET
                        modifiedon = GETDATE(),
                        statecode = @statecode,
                        statuscode = @statuscode
                    FROM BaseEntity b
                    JOIN contact c ON c.baseentityid = b.baseentityid
                    WHERE c.contactid = @contactid
                `);

            await auditLogRepository.writeLog(transaction, {
                entityName: 'contact',
                recordId: contactId,
                action: 'Update',
                userId: actor.id,
                userRole: actor.role,
                changeData: {
                    before: existing,
                    after: input,
                },
            });

            await transaction.commit();
            return this.getById(contactId);
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    async delete(contactId, actor) {
        const pool = await poolPromise;
        const existing = await this.getById(contactId);
        if (!existing) return false;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            await auditLogRepository.writeLog(transaction, {
                entityName: 'contact',
                recordId: contactId,
                action: 'Delete',
                userId: actor.id,
                userRole: actor.role,
                changeData: existing,
            });

            await new sql.Request(transaction)
                .input('contactid', sql.UniqueIdentifier, contactId)
                .query(`
                    DECLARE @baseentityid UNIQUEIDENTIFIER = (
                        SELECT baseentityid FROM contact WHERE contactid = @contactid
                    );

                    DELETE FROM contact WHERE contactid = @contactid;

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

module.exports = new ContactRepository();
