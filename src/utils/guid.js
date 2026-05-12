const ValidationException = require('../exceptions/ValidationException');

const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isGuid(value) {
    return GUID_REGEX.test(String(value || '').trim());
}

function requireGuid(value, fieldName = 'id') {
    const normalized = String(value || '').trim();
    if (!isGuid(normalized)) {
        throw new ValidationException(`${fieldName} must be a valid GUID.`);
    }
    return normalized;
}

module.exports = { isGuid, requireGuid };
