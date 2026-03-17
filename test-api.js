const http = require('http');

const request = (method, path, body) => {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost',
            port: 3000,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(data || '{}') }));
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

const safeRequest = async (method, path, body) => {
    const res = await request(method, path, body);
    if (res.data && res.data.error) {
        console.log(`[Ignored Error] ${path}:`, res.data.error);
    }
    return res;
};

const run = async () => {
    try {
        console.log('1. Creating entity "systemuser"...');
        const entity1 = await safeRequest('POST', '/api/metadata/entity', {
            logicalname: 'systemuser',
            displayname: 'System User',
            schemaname: 'SystemUser',
            primaryidattribute: 'systemuserid',
            primarynameattribute: 'fullname'
        });

        console.log('2. Creating attribute "email" for systemuser...');
        const attr1 = await safeRequest('POST', '/api/metadata/attribute', {
            entitylogicalname: 'systemuser',
            logicalname: 'email',
            displayname: 'Email Address',
            schemaname: 'Email',
            attributetype: 'String',
            maxlength: 100
        });

        console.log('3. Creating entity "contact"...');
        const entity2 = await safeRequest('POST', '/api/metadata/entity', {
            logicalname: 'contact',
            displayname: 'Contact',
            schemaname: 'Contact',
            primaryidattribute: 'contactid',
            primarynameattribute: 'fullname'
        });

        console.log('4. Creating lookup "ownerid" on contact -> systemuser...');
        const attr2 = await safeRequest('POST', '/api/metadata/attribute', {
            entitylogicalname: 'contact',
            logicalname: 'ownerid',
            displayname: 'Owner',
            schemaname: 'OwnerId',
            attributetype: 'Lookup'
        });
        const lookup1 = await safeRequest('POST', '/api/metadata/lookup', {
            entitylogicalname: 'contact',
            attributelogicalname: 'ownerid',
            referencedentitylogicalname: 'systemuser',
            schemaname: 'contact_systemuser_ownerid'
        });

        console.log('5. Creating a systemuser record...');
        const userRec = await safeRequest('POST', '/api/entity/systemuser', {
            fullname: 'Rahul Admin',
            email: 'admin@example.com'
        });
        console.log(userRec.data);

        console.log('6. Creating a contact record owned by the systemuser...');
        const contactRec = await safeRequest('POST', '/api/entity/contact', {
            fullname: 'John Doe',
            ownerid: userRec.data ? userRec.data.id : null
        });
        console.log(contactRec.data);

        console.log('7. Fetching contact records...');
        const fetchRec = await safeRequest('GET', '/api/entity/contact');
        console.log(fetchRec.data);
    } catch (e) {
        console.error('Error during testing:', e);
    }
};

run();
