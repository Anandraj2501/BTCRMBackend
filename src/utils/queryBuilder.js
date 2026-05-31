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
     * @param {Array<Object>} filters - Array of filter objects {field, operator, value}
     */
    static buildSelectQuery(logicalName, whereClauses = [], filters = []) {
        let query = `SELECT t.*, b.createdon, b.modifiedon, b.ownerid, b.statecode, b.statuscode, CASE WHEN b.statuscode = 1 THEN 'Active' ELSE 'Inactive' END as status FROM [${logicalName}] t JOIN BaseEntity b ON t.baseentityid = b.baseentityid WHERE b.statecode = 0`;

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
     */
    static buildBaseEntityInsertQuery() {
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
