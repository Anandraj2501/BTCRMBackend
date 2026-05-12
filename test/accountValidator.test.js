const assert = require('node:assert/strict');
const { validateAccountInput } = require('../src/validators/accountValidator');

const result = validateAccountInput({
    name: 'Blue Yonder',
    email: 'owner@blueyonder.com',
    status: 'Active',
    address: {
        city: 'Bengaluru',
    },
});

assert.equal(result.name, 'Blue Yonder');
assert.equal(result.email, 'owner@blueyonder.com');
assert.equal(result.city, 'Bengaluru');

assert.throws(() => {
    validateAccountInput({
        name: 'Broken Account',
        email: 'bad-email',
    });
});

console.log('accountValidator.test.js passed');
