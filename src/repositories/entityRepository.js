const IEntityRepository = require('../interfaces/IEntityRepository');
const { sql, poolPromise } = require('../config/db');
const QueryBuilder = require('../utils/queryBuilder');

class EntityRepository extends IEntityRepository {
    async createBaseEntity(transaction, logicalName, ownerId, appId = null) {
        const req = new sql.Request(transaction);
        req.input('logicalname', sql.NVarChar(100), logicalName);
        req.input('ownerid', sql.UniqueIdentifier, ownerId);
        if (appId) req.input('appid', sql.UniqueIdentifier, appId);
        const result = await req.query(QueryBuilder.buildBaseEntityInsertQuery(appId));
        return result.recordset[0].baseentityid;
    }

    // Returns the set of computed column names for a given table (lowercased)
    async getComputedColumns(tableName) {
        const pool = await poolPromise;
        try {
            const result = await pool.request()
                .input('tableName', sql.NVarChar(200), tableName)
                .query(`
                    SELECT c.name AS colname
                    FROM sys.computed_columns c
                    JOIN sys.tables t ON c.object_id = t.object_id
                    WHERE t.name = @tableName
                `);
            return new Set(result.recordset.map(r => r.colname.toLowerCase()));
        } catch { return new Set(); }
    }

    async createRecord(logicalName, data, primaryIdKey, hasBaseEntity, appId = null) {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            let baseEntityId = null;
            if (hasBaseEntity) {
                const ownerId = data.ownerid || '00000000-0000-0000-0000-000000000000';
                baseEntityId = await this.createBaseEntity(transaction, logicalName, ownerId, appId);
            }

            // Strip computed columns so SQL Server doesn't reject the INSERT
            const computedCols = await this.getComputedColumns(logicalName);

            const recordId = require('crypto').randomUUID();
            const keys = Object.keys(data).filter(k =>
                k !== 'ownerid' &&
                k !== 'baseentityid' &&
                k !== primaryIdKey &&
                !computedCols.has(k.toLowerCase())
            );

            const tableColumns = hasBaseEntity ? ['baseentityid', primaryIdKey, ...keys] : [primaryIdKey, ...keys];

            const entityReq = new sql.Request(transaction);
            if (hasBaseEntity) entityReq.input('baseentityid', sql.UniqueIdentifier, baseEntityId);
            entityReq.input(primaryIdKey, sql.UniqueIdentifier, recordId);

            for (const key of keys) {
                entityReq.input(key, data[key]);
            }

            const query = QueryBuilder.buildInsertQuery(logicalName, tableColumns);
            await entityReq.query(query);

            await transaction.commit();
            return { id: recordId, baseEntityId };
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    async getRecords(logicalName, hasBaseEntity, appId = null, filters = []) {
        const pool = await poolPromise;
        let query;
        if (hasBaseEntity) {
            query = QueryBuilder.buildSelectQuery(logicalName, [], appId, filters);
        } else {
            // Very simple fallback for non-base entities
            query = `SELECT * FROM [${logicalName}]`;
        }
        const req = pool.request();
        if (hasBaseEntity && appId) req.input('appid', sql.UniqueIdentifier, appId);
        
        // Parameterize filters
        filters.forEach((f, i) => {
            req.input(`filterValue${i}`, f.value);
        });

        const result = await req.query(query);
        return result.recordset;
    }

    async getRecordById(logicalName, primaryIdKey, id, hasBaseEntity, appId = null) {
        const pool = await poolPromise;
        let query;
        if (hasBaseEntity) {
            query = QueryBuilder.buildSelectQuery(logicalName, [{ column: primaryIdKey, param: 'id' }], appId);
        } else {
            query = `SELECT * FROM [${logicalName}] WHERE [${primaryIdKey}] = @id`;
        }
        const req = pool.request().input('id', sql.UniqueIdentifier, id);
        if (hasBaseEntity && appId) req.input('appid', sql.UniqueIdentifier, appId);
        const result = await req.query(query);
        return result.recordset[0] || null;
    }

    async updateRecord(logicalName, primaryIdKey, id, baseEntityId, data) {
        const pool = await poolPromise;
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Strip computed columns so SQL Server doesn't reject the UPDATE
            const computedCols = await this.getComputedColumns(logicalName);
            const updateKeys = Object.keys(data).filter(k =>
                k !== 'ownerid' &&
                k !== 'baseentityid' &&
                k !== primaryIdKey &&
                !computedCols.has(k.toLowerCase())
            );
            
            if (updateKeys.length > 0) {
                const updateReq = new sql.Request(transaction);
                updateReq.input(primaryIdKey, sql.UniqueIdentifier, id);
                for (const key of updateKeys) {
                    updateReq.input(key, data[key]);
                }
                const query = QueryBuilder.buildUpdateQuery(logicalName, primaryIdKey, updateKeys);
                await updateReq.query(query);
            }

            if (baseEntityId) {
                const baseReq = new sql.Request(transaction);
                baseReq.input('baseentityid', sql.UniqueIdentifier, baseEntityId);
                await baseReq.query(QueryBuilder.buildBaseEntityUpdateQuery());
            }

            await transaction.commit();
            return true;
        } catch (err) {
            await transaction.rollback();
            throw err;
        }
    }

    async softDeleteRecord(baseEntityId) {
        const pool = await poolPromise;
        await pool.request()
            .input('baseentityid', sql.UniqueIdentifier, baseEntityId)
            .query(QueryBuilder.buildSoftDeleteQuery());
        return true;
    }

    async verifyRecordExists(logicalName, primaryIdKey, id) {
        const pool = await poolPromise;
        const query = `SELECT TOP 1 [${primaryIdKey}] FROM [${logicalName}] WHERE [${primaryIdKey}] = @id`;
        try {
            const result = await pool.request()
                .input('id', sql.UniqueIdentifier, id)
                .query(query);
            return result.recordset.length > 0;
        } catch (e) {
            return false;
        }
    }

    async getBaseEntityId(logicalName, primaryIdKey, id) {
        const pool = await poolPromise;
        const query = QueryBuilder.buildBaseIdLookupQuery(logicalName, primaryIdKey);
        const result = await pool.request()
            .input('id', sql.UniqueIdentifier, id)
            .query(query);
        return result.recordset.length > 0 ? result.recordset[0].baseentityid : null;
    }

    async searchRecords(logicalName, primaryNameAttribute, query, appId = null) {
        const pool = await poolPromise;
        const safeTable = `[${logicalName}]`;
        const safeNameCol = `[${primaryNameAttribute}]`;
        let sql_query;
        const req = pool.request().input('q', sql.NVarChar(255), `%${query}%`);

        if (appId) {
            req.input('appid', sql.UniqueIdentifier, appId);
            // Join through BaseEntity so we can filter by appid
            sql_query = `SELECT TOP 20 t.* FROM ${safeTable} t JOIN BaseEntity b ON t.baseentityid = b.baseentityid WHERE ${safeNameCol} LIKE @q AND b.statecode = 0 AND (b.appid = @appid OR b.appid IS NULL)`;
        } else {
            sql_query = `SELECT TOP 20 * FROM ${safeTable} WHERE ${safeNameCol} LIKE @q`;
        }

        const result = await req.query(sql_query);
        return result.recordset;
    }

    async getRecordsByView(logicalName, viewDefinition) {
        const pool = await poolPromise;
        const safeTable = `[${logicalName}]`;
        const def = viewDefinition;
        const req = pool.request();

        // Build SELECT columns
        const colList = def.columns && def.columns.length > 0
            ? def.columns.map(c => `[${c}]`).join(', ')
            : '*';

        // Build WHERE clause from filters
        let whereFragments = [];
        const OPERATOR_MAP = {
            eq: '=', neq: '<>', gt: '>', lt: '<', gte: '>=', lte: '<=',
            contains: 'LIKE', startswith: 'LIKE', endswith: 'LIKE'
        };

        (def.filters || []).forEach((f, i) => {
            const paramName = `fval${i}`;
            const op = OPERATOR_MAP[f.operator] || '=';
            let val = f.value;
            if (f.operator === 'contains')   val = `%${val}%`;
            if (f.operator === 'startswith') val = `${val}%`;
            if (f.operator === 'endswith')   val = `%${val}`;
            req.input(paramName, sql.NVarChar(500), val);
            whereFragments.push(`[${f.field}] ${op} @${paramName}`);
        });

        // Build ORDER BY from sorting
        let orderBy = '';
        if (def.sorting && def.sorting.length > 0) {
            const sortParts = def.sorting.map(s => `[${s.field}] ${s.direction === 'desc' ? 'DESC' : 'ASC'}`);
            orderBy = `ORDER BY ${sortParts.join(', ')}`;
        }

        const where = whereFragments.length > 0 ? `WHERE ${whereFragments.join(' AND ')}` : '';
        const query = `SELECT TOP 500 ${colList} FROM ${safeTable} ${where} ${orderBy}`;

        const result = await req.query(query);
        return result.recordset;
    }
}

module.exports = new EntityRepository();

