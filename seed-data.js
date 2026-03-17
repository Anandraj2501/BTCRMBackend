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
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data || '{}') });
                } catch(e) {
                    console.error("Failed to parse JSON:", data);
                    resolve({ status: res.statusCode, data: data });
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
};

const safeRequest = async (method, path, body) => {
    const res = await request(method, path, body);
    if (res.data && res.data.error) {
        console.log(`[Warning] ${path} returned error:`, res.data.error);
    } else if (res.data && res.data.success === false) {
        console.log(`[Warning] ${path} returned false:`, res.data.message);
    }
    return res;
};

const run = async () => {
    try {
        console.log('1. Verifying / Creating Lookup Metadata for Contact -> Organization...');
        await safeRequest('POST', '/api/metadata/lookup', {
            entitylogicalname: 'contact',
            attributelogicalname: 'parentorganizationid',
            referencedentitylogicalname: 'organization',
            schemaname: 'contact_organization_parentorganizationid'
        });

        console.log('2. Fetching existing systemuser to act as owner...');
        let users = await request('GET', '/api/entity/systemuser');
        let ownerId = null;
        
        if (users.data && users.data.data && users.data.data.length > 0) {
            ownerId = users.data.data[0].systemuserid;
            console.log("Found existing user ownerId:", ownerId);
        } else {
            console.log("No systemuser found. Creating one...");
            const userRes = await request('POST', '/api/entity/systemuser', {
                fullname: 'System Admin',
                internalemailaddress: 'admin@crm.local'
            });
            console.log(userRes.data);
            ownerId = userRes.data.data.id;
        }

        console.log('3. Creating Organization record...');
        const orgRes = await request('POST', '/api/entity/organization', {
            name: 'Acme Corp',
            city: 'New York',
            country: 'USA',
            websiteurl: 'https://acme.org',
            ownerid: ownerId
        });
        console.log(orgRes.data);
        const orgId = orgRes.data.data.id;

        console.log('4. Creating Contact record linked to Organization...');
        const contactRes = await request('POST', '/api/entity/contact', {
            firstname: 'Jane',
            lastname: 'Doe',
            emailaddress1: 'jane.doe@acme.org',
            parentorganizationid: orgId,
            ownerid: ownerId
        });
        console.log(contactRes.data);

        console.log('5. Creating another Organization record...');
        const orgRes2 = await request('POST', '/api/entity/organization', {
            name: 'Globex Corporation',
            city: 'Springfield',
            ownerid: ownerId
        });
        console.log(orgRes2.data);
        const orgId2 = orgRes2.data.data.id;

        console.log('6. Creating another Contact record linked to Globex...');
        const contactRes2 = await request('POST', '/api/entity/contact', {
            firstname: 'Homer',
            lastname: 'Simpson',
            jobtitle: 'Safety Inspector',
            parentorganizationid: orgId2,
            ownerid: ownerId
        });
        console.log(contactRes2.data);

        console.log('7. Final verification - Get all Contacts...');
        const verifyRes = await request('GET', '/api/entity/contact');
        console.log(JSON.stringify(verifyRes.data, null, 2));

    } catch (e) {
        console.error('Script Error:', e);
    }
};

run();
