const { sql, poolPromise } = require('../config/db');

class OptionSetRepository {
    async createOptionSet(data) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('name', sql.NVarChar(200), data.name)
            .input('displayname', sql.NVarChar(200), data.displayname || data.name)
            .input('isglobal', sql.Bit, data.isglobal ? 1 : 0)
            .input('entitylogicalname', sql.NVarChar(200), data.entitylogicalname || null)
            .input('optionsjson', sql.NVarChar(sql.MAX), JSON.stringify(data.options || []))
            .query(`
                INSERT INTO OptionSetMetadata (name, displayname, isglobal, entitylogicalname, optionsjson)
                OUTPUT INSERTED.optionsetid
                VALUES (@name, @displayname, @isglobal, @entitylogicalname, @optionsjson)
            `);
        return result.recordset[0];
    }

    async getAllOptionSets() {
        const pool = await poolPromise;
        const result = await pool.request()
            .query(`SELECT optionsetid, name, displayname, isglobal, entitylogicalname, optionsjson, createdon FROM OptionSetMetadata ORDER BY displayname`);
        return result.recordset.map(r => ({ ...r, options: JSON.parse(r.optionsjson) }));
    }

    async getOptionSetById(optionsetid) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('optionsetid', sql.UniqueIdentifier, optionsetid)
            .query(`SELECT * FROM OptionSetMetadata WHERE optionsetid = @optionsetid`);
        const row = result.recordset[0];
        if (!row) return null;
        return { ...row, options: JSON.parse(row.optionsjson) };
    }

    async updateOptionSet(optionsetid, data) {
        const pool = await poolPromise;
        await pool.request()
            .input('optionsetid', sql.UniqueIdentifier, optionsetid)
            .input('displayname', sql.NVarChar(200), data.displayname)
            .input('optionsjson', sql.NVarChar(sql.MAX), JSON.stringify(data.options || []))
            .query(`
                UPDATE OptionSetMetadata 
                SET displayname = @displayname, optionsjson = @optionsjson
                WHERE optionsetid = @optionsetid
            `);
    }

    async getOptionSetByAttributeId(attributeId) {
        const pool = await poolPromise;
        const result = await pool.request()
            .input('attributeid', sql.UniqueIdentifier, attributeId)
            .query(`
                SELECT o.* FROM OptionSetMetadata o
                JOIN AttributeMetadata a ON a.optionsetid = o.optionsetid
                WHERE a.attributeid = @attributeid
            `);
        const row = result.recordset[0];
        if (!row) return null;
        return { ...row, options: JSON.parse(row.optionsjson) };
    }
}

module.exports = new OptionSetRepository();
