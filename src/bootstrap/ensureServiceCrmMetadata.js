const { randomUUID } = require('crypto');
const { sql, poolPromise } = require('../config/db');
const metadataCache = require('../utils/metadataCache');

const ENTITIES = [
    {
        logicalname: 'Cases',
        displayname: 'Case',
        schemaname: 'Cases',
        primaryidattribute: 'CaseId',
        primarynameattribute: 'Title',
        attributes: [
            ['CaseId', 'Case Id', 'Uniqueidentifier', null, false, false],
            ['Title', 'Title', 'String', 200, false, true],
            ['Description', 'Description', 'Memo', null, true, false],
            ['TicketNumber', 'Ticket Number', 'String', 100, false, false],
            ['Priority', 'Priority', 'OptionSet', 20, false, false],
            ['Status', 'Status', 'OptionSet', 20, false, false],
            ['AccountId', 'Account', 'Lookup', null, false, false],
            ['ContactId', 'Contact', 'Lookup', null, true, false],
            ['SLAId', 'Applied SLA', 'Lookup', null, true, false],
            ['FirstResponseDueDate', 'First Response Due Date', 'DateTime', null, true, false],
            ['ResolutionDueDate', 'Resolution Due Date', 'DateTime', null, true, false],
            ['FirstResponseActualTime', 'First Response Actual Time', 'DateTime', null, true, false],
            ['ResolutionActualTime', 'Resolution Actual Time', 'DateTime', null, true, false],
            ['SLAStatus', 'SLA Status', 'OptionSet', 20, false, false],
            ['CreatedOn', 'Created On', 'DateTime', null, false, false],
            ['ModifiedOn', 'Modified On', 'DateTime', null, false, false],
        ],
    },
    {
        logicalname: 'SLAs',
        displayname: 'SLA',
        schemaname: 'SLAs',
        primaryidattribute: 'SLAId',
        primarynameattribute: 'Name',
        attributes: [
            ['SLAId', 'SLA Id', 'Uniqueidentifier', null, false, false],
            ['Name', 'Name', 'String', 200, false, true],
            ['ApplicableEntity', 'Applicable Entity', 'String', 50, false, false],
            ['IsDefault', 'Default', 'Boolean', null, false, false],
            ['Status', 'Status', 'OptionSet', 20, false, false],
            ['CreatedOn', 'Created On', 'DateTime', null, false, false],
        ],
    },
    {
        logicalname: 'SLA_Items',
        displayname: 'SLA Item',
        schemaname: 'SLA_Items',
        primaryidattribute: 'SLAItemId',
        primarynameattribute: 'Name',
        attributes: [
            ['SLAItemId', 'SLA Item Id', 'Uniqueidentifier', null, false, false],
            ['SLAId', 'SLA', 'Lookup', null, false, false],
            ['Name', 'Name', 'String', 200, false, true],
            ['ApplicableWhen', 'Applicable When', 'Memo', null, true, false],
            ['FirstResponseTime', 'First Response Time', 'Integer', null, false, false],
            ['ResolutionTime', 'Resolution Time', 'Integer', null, false, false],
            ['SortOrder', 'Sort Order', 'Integer', null, false, false],
            ['CreatedOn', 'Created On', 'DateTime', null, false, false],
        ],
    },
    {
        logicalname: 'Entitlements',
        displayname: 'Entitlement',
        schemaname: 'Entitlements',
        primaryidattribute: 'EntitlementId',
        primarynameattribute: 'EntitlementId',
        attributes: [
            ['EntitlementId', 'Entitlement Id', 'Uniqueidentifier', null, false, true],
            ['AccountId', 'Account', 'Lookup', null, false, false],
            ['SLAId', 'SLA', 'Lookup', null, false, false],
            ['StartDate', 'Start Date', 'DateTime', null, false, false],
            ['EndDate', 'End Date', 'DateTime', null, false, false],
            ['Status', 'Status', 'OptionSet', 20, false, false],
            ['CreatedOn', 'Created On', 'DateTime', null, false, false],
        ],
    },
];

const LOOKUPS = [
    ['Cases', 'AccountId', 'account', 'FK_Cases_account', 'OneToMany'],
    ['Cases', 'ContactId', 'contact', 'FK_Cases_contact', 'OneToMany'],
    ['Cases', 'SLAId', 'SLAs', 'FK_Cases_SLAs', 'OneToMany'],
    ['SLA_Items', 'SLAId', 'SLAs', 'FK_SLA_Items_SLAs', 'OneToMany'],
    ['Entitlements', 'AccountId', 'account', 'FK_Entitlements_account', 'OneToMany'],
    ['Entitlements', 'SLAId', 'SLAs', 'FK_Entitlements_SLAs', 'OneToMany'],
];

const EXISTING_ENTITY_ATTRIBUTE_FIXES = [
    ['account', ['accounttype', 'Account Type', 'OptionSet', 20, false, false]],
    ['contact', ['lastname', 'Last Name', 'String', 100, true, false]],
];

let ensurePromise = null;

async function upsertEntity(pool, entity) {
    const entityId = randomUUID();
    await pool.request()
        .input('entityid', sql.UniqueIdentifier, entityId)
        .input('logicalname', sql.NVarChar(100), entity.logicalname)
        .input('displayname', sql.NVarChar(100), entity.displayname)
        .input('schemaname', sql.NVarChar(100), entity.schemaname)
        .input('primaryidattribute', sql.NVarChar(100), entity.primaryidattribute)
        .input('primarynameattribute', sql.NVarChar(100), entity.primarynameattribute)
        .query(`
            IF NOT EXISTS (SELECT 1 FROM dbo.EntityMetadata WHERE logicalname = @logicalname)
            BEGIN
                INSERT INTO dbo.EntityMetadata (
                    entityid, logicalname, displayname, schemaname,
                    primaryidattribute, primarynameattribute, isactivity, iscustomentity, createdon, modifiedon
                )
                VALUES (
                    @entityid, @logicalname, @displayname, @schemaname,
                    @primaryidattribute, @primarynameattribute, 0, 0, GETDATE(), GETDATE()
                );
            END
            ELSE
            BEGIN
                UPDATE dbo.EntityMetadata
                SET
                    displayname = @displayname,
                    schemaname = @schemaname,
                    primaryidattribute = @primaryidattribute,
                    primarynameattribute = @primarynameattribute,
                    modifiedon = GETDATE()
                WHERE logicalname = @logicalname;
            END
        `);
}

async function upsertAttribute(pool, entityLogicalName, attribute) {
    const [logicalname, displayname, attributetype, maxlength, isnullable, isprimaryname] = attribute;
    const attributeId = randomUUID();
    await pool.request()
        .input('attributeid', sql.UniqueIdentifier, attributeId)
        .input('entitylogicalname', sql.NVarChar(100), entityLogicalName)
        .input('logicalname', sql.NVarChar(100), logicalname)
        .input('displayname', sql.NVarChar(100), displayname)
        .input('schemaname', sql.NVarChar(100), logicalname)
        .input('attributetype', sql.NVarChar(50), attributetype)
        .input('maxlength', sql.Int, maxlength)
        .input('isnullable', sql.Bit, isnullable ? 1 : 0)
        .input('isprimaryname', sql.Bit, isprimaryname ? 1 : 0)
        .query(`
            DECLARE @entityid UNIQUEIDENTIFIER = (
                SELECT entityid FROM dbo.EntityMetadata WHERE logicalname = @entitylogicalname
            );

            IF NOT EXISTS (
                SELECT 1 FROM dbo.AttributeMetadata
                WHERE entityid = @entityid AND logicalname = @logicalname
            )
            BEGIN
                INSERT INTO dbo.AttributeMetadata (
                    attributeid, entityid, logicalname, displayname, schemaname,
                    attributetype, maxlength, isnullable, isprimaryname, createdon
                )
                VALUES (
                    @attributeid, @entityid, @logicalname, @displayname, @schemaname,
                    @attributetype, @maxlength, @isnullable, @isprimaryname, GETDATE()
                );
            END
            ELSE
            BEGIN
                UPDATE dbo.AttributeMetadata
                SET
                    displayname = @displayname,
                    schemaname = @schemaname,
                    attributetype = @attributetype,
                    maxlength = @maxlength,
                    isnullable = @isnullable,
                    isprimaryname = @isprimaryname
                WHERE entityid = @entityid AND logicalname = @logicalname;
            END
        `);
}

async function upsertLookup(pool, lookup) {
    const [entityLogicalName, attributeLogicalName, referencedEntityLogicalName, schemaName, relationshipType] = lookup;
    const lookupId = randomUUID();
    await pool.request()
        .input('lookupid', sql.UniqueIdentifier, lookupId)
        .input('entitylogicalname', sql.NVarChar(100), entityLogicalName)
        .input('attributelogicalname', sql.NVarChar(100), attributeLogicalName)
        .input('referencedentitylogicalname', sql.NVarChar(100), referencedEntityLogicalName)
        .input('schemaname', sql.NVarChar(100), schemaName)
        .input('relationshiptype', sql.NVarChar(50), relationshipType)
        .query(`
            DECLARE @entityid UNIQUEIDENTIFIER = (
                SELECT entityid FROM dbo.EntityMetadata WHERE logicalname = @entitylogicalname
            );
            DECLARE @attributeid UNIQUEIDENTIFIER = (
                SELECT attributeid FROM dbo.AttributeMetadata
                WHERE entityid = @entityid AND logicalname = @attributelogicalname
            );
            DECLARE @referencedentityid UNIQUEIDENTIFIER = (
                SELECT entityid FROM dbo.EntityMetadata WHERE logicalname = @referencedentitylogicalname
            );

            IF @entityid IS NOT NULL AND @attributeid IS NOT NULL AND @referencedentityid IS NOT NULL
               AND NOT EXISTS (
                    SELECT 1 FROM dbo.LookupMetadata
                    WHERE entityid = @entityid
                      AND attributeid = @attributeid
                      AND referencedentityid = @referencedentityid
               )
            BEGIN
                INSERT INTO dbo.LookupMetadata (
                    lookupid, entityid, attributeid, referencedentityid, schemaname, relationshiptype
                )
                VALUES (
                    @lookupid, @entityid, @attributeid, @referencedentityid, @schemaname, @relationshiptype
                );
            END
        `);
}

async function ensureServiceCrmMetadata() {
    if (ensurePromise) return ensurePromise;

    ensurePromise = (async () => {
        const pool = await poolPromise;
        for (const [entityLogicalName, attribute] of EXISTING_ENTITY_ATTRIBUTE_FIXES) {
            await upsertAttribute(pool, entityLogicalName, attribute);
            metadataCache.invalidateEntity(entityLogicalName);
        }

        for (const entity of ENTITIES) {
            await upsertEntity(pool, entity);
            for (const attribute of entity.attributes) {
                await upsertAttribute(pool, entity.logicalname, attribute);
            }
            metadataCache.invalidateEntity(entity.logicalname);
        }

        for (const lookup of LOOKUPS) {
            await upsertLookup(pool, lookup);
        }
    })();

    try {
        await ensurePromise;
    } catch (error) {
        ensurePromise = null;
        throw error;
    }
}

module.exports = { ensureServiceCrmMetadata };
