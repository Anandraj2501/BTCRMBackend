const assert = require('node:assert/strict');
const { validateContactInput } = require('../src/validators/contactValidator');

const result = validateContactInput({
    firstName: 'Ava',
    lastName: 'Stone',
    parentAccountId: '11111111-1111-4111-8111-111111111111',
});

assert.equal(result.firstName, 'Ava');
assert.equal(result.lastName, 'Stone');

assert.throws(() => {
    validateContactInput({
        lastName: 'Stone',
    });
});

console.log('contactValidator.test.js passed');
