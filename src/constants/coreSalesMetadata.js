const CORE_ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const CORE_CONTACT_ID = '22222222-2222-4222-8222-222222222222';
const CORE_PARENT_ACCOUNT_ATTRIBUTE_ID = '33333333-3333-4333-8333-333333333333';

function nowIso() {
    return new Date().toISOString();
}

function createCoreDefinition(logicalName) {
    const createdOn = nowIso();

    if (logicalName === 'account') {
        const metadata = {
            entityid: CORE_ACCOUNT_ID,
            logicalname: 'account',
            displayname: 'Account',
            schemaname: 'Account',
            primaryidattribute: 'accountid',
            primarynameattribute: 'name',
            isactivity: 0,
            iscustomentity: 0,
            createdon: createdOn,
            modifiedon: createdOn,
        };

        const attributes = [
            { attributeid: '11111111-aaaa-4111-8111-111111111111', entityid: CORE_ACCOUNT_ID, logicalname: 'baseentityid', displayname: 'Base Entity Identifier', schemaname: 'BaseEntityId', attributetype: 'Uniqueidentifier', maxlength: null, isnullable: 0, isprimaryname: 0, createdon: createdOn },
            { attributeid: '11111111-bbbb-4111-8111-111111111111', entityid: CORE_ACCOUNT_ID, logicalname: 'name', displayname: 'Name', schemaname: 'Name', attributetype: 'String', maxlength: 200, isnullable: 0, isprimaryname: 1, createdon: createdOn },
            { attributeid: '11111111-cccc-4111-8111-111111111111', entityid: CORE_ACCOUNT_ID, logicalname: 'accountnumber', displayname: 'Account Number', schemaname: 'AccountNumber', attributetype: 'String', maxlength: 100, isnullable: 1, isprimaryname: 0, createdon: createdOn },
            { attributeid: '11111111-dddd-4111-8111-111111111111', entityid: CORE_ACCOUNT_ID, logicalname: 'email', displayname: 'Email', schemaname: 'Email', attributetype: 'String', maxlength: 200, isnullable: 1, isprimaryname: 0, createdon: createdOn },
            { attributeid: '11111111-eeee-4111-8111-111111111111', entityid: CORE_ACCOUNT_ID, logicalname: 'phone', displayname: 'Phone', schemaname: 'Phone', attributetype: 'String', maxlength: 50, isnullable: 1, isprimaryname: 0, createdon: createdOn },
            { attributeid: '11111111-ffff-4111-8111-111111111111', entityid: CORE_ACCOUNT_ID, logicalname: 'street', displayname: 'Street', schemaname: 'Street', attributetype: 'String', maxlength: 200, isnullable: 1, isprimaryname: 0, createdon: createdOn },
            { attributeid: '11111111-abcd-4111-8111-111111111111', entityid: CORE_ACCOUNT_ID, logicalname: 'city', displayname: 'City', schemaname: 'City', attributetype: 'String', maxlength: 100, isnullable: 1, isprimaryname: 0, createdon: createdOn },
            { attributeid: '11111111-bcde-4111-8111-111111111111', entityid: CORE_ACCOUNT_ID, logicalname: 'state', displayname: 'State', schemaname: 'State', attributetype: 'String', maxlength: 100, isnullable: 1, isprimaryname: 0, createdon: createdOn },
            { attributeid: '11111111-cdef-4111-8111-111111111111', entityid: CORE_ACCOUNT_ID, logicalname: 'country', displayname: 'Country', schemaname: 'Country', attributetype: 'String', maxlength: 100, isnullable: 1, isprimaryname: 0, createdon: createdOn },
            { attributeid: '11111111-def0-4111-8111-111111111111', entityid: CORE_ACCOUNT_ID, logicalname: 'zip', displayname: 'Zip', schemaname: 'Zip', attributetype: 'String', maxlength: 20, isnullable: 1, isprimaryname: 0, createdon: createdOn },
        ];

        return {
            metadata,
            attributes,
            lookups: [],
            attributeMap: Object.fromEntries(attributes.map((attribute) => [attribute.logicalname, attribute])),
        };
    }

    if (logicalName === 'contact') {
        const metadata = {
            entityid: CORE_CONTACT_ID,
            logicalname: 'contact',
            displayname: 'Contact',
            schemaname: 'Contact',
            primaryidattribute: 'contactid',
            primarynameattribute: 'fullname',
            isactivity: 0,
            iscustomentity: 0,
            createdon: createdOn,
            modifiedon: createdOn,
        };

        const attributes = [
            { attributeid: '22222222-aaaa-4222-8222-222222222222', entityid: CORE_CONTACT_ID, logicalname: 'baseentityid', displayname: 'Base Entity Identifier', schemaname: 'BaseEntityId', attributetype: 'Uniqueidentifier', maxlength: null, isnullable: 0, isprimaryname: 0, createdon: createdOn },
            { attributeid: '22222222-bbbb-4222-8222-222222222222', entityid: CORE_CONTACT_ID, logicalname: 'firstname', displayname: 'First Name', schemaname: 'FirstName', attributetype: 'String', maxlength: 100, isnullable: 0, isprimaryname: 0, createdon: createdOn },
            { attributeid: '22222222-cccc-4222-8222-222222222222', entityid: CORE_CONTACT_ID, logicalname: 'lastname', displayname: 'Last Name', schemaname: 'LastName', attributetype: 'String', maxlength: 100, isnullable: 0, isprimaryname: 0, createdon: createdOn },
            { attributeid: '22222222-dddd-4222-8222-222222222222', entityid: CORE_CONTACT_ID, logicalname: 'fullname', displayname: 'Full Name', schemaname: 'FullName', attributetype: 'String', maxlength: 201, isnullable: 0, isprimaryname: 1, createdon: createdOn },
            { attributeid: '22222222-eeee-4222-8222-222222222222', entityid: CORE_CONTACT_ID, logicalname: 'email', displayname: 'Email', schemaname: 'Email', attributetype: 'String', maxlength: 200, isnullable: 1, isprimaryname: 0, createdon: createdOn },
            { attributeid: '22222222-ffff-4222-8222-222222222222', entityid: CORE_CONTACT_ID, logicalname: 'phone', displayname: 'Phone', schemaname: 'Phone', attributetype: 'String', maxlength: 50, isnullable: 1, isprimaryname: 0, createdon: createdOn },
            { attributeid: CORE_PARENT_ACCOUNT_ATTRIBUTE_ID, entityid: CORE_CONTACT_ID, logicalname: 'parentaccountid', displayname: 'Account', schemaname: 'ParentAccountId', attributetype: 'Lookup', maxlength: null, isnullable: 1, isprimaryname: 0, createdon: createdOn },
            { attributeid: '22222222-abcd-4222-8222-222222222222', entityid: CORE_CONTACT_ID, logicalname: 'jobtitle', displayname: 'Job Title', schemaname: 'JobTitle', attributetype: 'String', maxlength: 100, isnullable: 1, isprimaryname: 0, createdon: createdOn },
        ];

        const lookups = [
            {
                lookupid: '44444444-4444-4444-8444-444444444444',
                entityid: CORE_CONTACT_ID,
                attributeid: CORE_PARENT_ACCOUNT_ATTRIBUTE_ID,
                referencedentityid: CORE_ACCOUNT_ID,
                schemaname: 'FK_contact_account',
                relationshiptype: 'OneToMany',
                attributelogicalname: 'parentaccountid',
                referencedentityname: 'account',
            },
        ];

        return {
            metadata,
            attributes,
            lookups,
            attributeMap: Object.fromEntries(attributes.map((attribute) => [attribute.logicalname, attribute])),
        };
    }

    return null;
}

function getCoreEntityDefinition(logicalName) {
    return createCoreDefinition(String(logicalName || '').toLowerCase());
}

function getCoreEntitiesList() {
    return ['account', 'contact']
        .map((logicalName) => getCoreEntityDefinition(logicalName)?.metadata)
        .filter(Boolean);
}

module.exports = {
    getCoreEntityDefinition,
    getCoreEntitiesList,
};
