class QueryBuilder {
    static buildInsertQuery(logicalName, columns) {
        const vars = columns.map(c => `@${c}`);
        const cols = columns.map(c => `[${c}]`);
        return `INSERT INTO [${logicalName}] (${cols.join(', ')}) VALUES (${vars.join(', ')})`;
    }

    /**
     * Build a SELECT query that joins through BaseEntity.
     * @param {string} logicalName - The entity table name.
     * @param {Array<{column:string, param:string}>} whereClauses - Extra WHERE conditions on the entity table.
     * @param {string|null} appId - When provided, filters to records that belong to this app (or have no app set).
     * @param {Array<Object>} filters - Array of filter objects {field, operator, value}
     */
    static buildSelectQuery(logicalName, whereClauses = [], appId = null, filters = []) {
        let query = `SELECT t.* FROM [${logicalName}] t JOIN BaseEntity b ON t.baseentityid = b.baseentityid WHERE b.statecode = 0`;

        if (appId) {
            // Show records that either belong to this app, or have no appid (legacy rows)
            query += ` AND (b.appid = @appid OR b.appid IS NULL)`;
        }

        if (whereClauses.length > 0) {
            whereClauses.forEach(w => {
                query += ` AND t.[${w.column}] = @${w.param}`;
            });
        }
        
        if (filters && filters.length > 0) {
            const OPERATOR_MAP = {
                eq: '=', neq: '<>', gt: '>', lt: '<', gte: '>=', lte: '<=',
                contains: 'LIKE', startswith: 'LIKE', endswith: 'LIKE'
            };
            filters.forEach((f, i) => {
                const op = OPERATOR_MAP[f.operator] || '=';
                query += ` AND t.[${f.field}] ${op} @filterValue${i}`;
            });
        }

        return query;
    }

    static buildUpdateQuery(logicalName, primaryIdKey, updateColumns) {
        const sets = updateColumns.map(c => `[${c}] = @${c}`);
        return `UPDATE [${logicalName}] SET ${sets.join(', ')} WHERE [${primaryIdKey}] = @${primaryIdKey}`;
    }

    static buildSoftDeleteQuery() {
        return `UPDATE BaseEntity SET statecode = 1, modifiedon = GETDATE() WHERE baseentityid = @baseentityid`;
    }

    /**
     * @param {string|null} appId - If provided, stores the owning app on the new base entity row.
     */
    static buildBaseEntityInsertQuery(appId = null) {
        if (appId) {
            return `INSERT INTO BaseEntity (baseentityid, logicalname, ownerid, appid, createdon, modifiedon, statecode, statuscode) OUTPUT INSERTED.baseentityid VALUES (NEWID(), @logicalname, @ownerid, @appid, GETDATE(), GETDATE(), 0, 1)`;
        }
        return `INSERT INTO BaseEntity (baseentityid, logicalname, ownerid, createdon, modifiedon, statecode, statuscode) OUTPUT INSERTED.baseentityid VALUES (NEWID(), @logicalname, @ownerid, GETDATE(), GETDATE(), 0, 1)`;
    }

    static buildBaseEntityUpdateQuery() {
        return `UPDATE BaseEntity SET modifiedon = GETDATE() WHERE baseentityid = @baseentityid`;
    }

    static buildBaseIdLookupQuery(logicalName, primaryIdKey) {
        return `SELECT t.baseentityid FROM [${logicalName}] t JOIN BaseEntity b ON t.baseentityid = b.baseentityid WHERE t.[${primaryIdKey}] = @id AND b.statecode = 0`;
    }
}

module.exports = QueryBuilder;
