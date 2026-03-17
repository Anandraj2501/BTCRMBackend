class QueryBuilder {
    static buildInsertQuery(logicalName, columns) {
        const vars = columns.map(c => `@${c}`);
        const cols = columns.map(c => `[${c}]`);
        return `INSERT INTO [${logicalName}] (${cols.join(', ')}) VALUES (${vars.join(', ')})`;
    }

    static buildSelectQuery(logicalName, whereClauses = []) {
        let query = `SELECT t.* FROM [${logicalName}] t JOIN BaseEntity b ON t.baseentityid = b.baseentityid WHERE b.statecode = 0`;
        if (whereClauses.length > 0) {
            whereClauses.forEach(w => {
                 query += ` AND t.[${w.column}] = @${w.param}`;
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
