const ValidationException = require('../exceptions/ValidationException');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const VALID_STATUSES = new Set(['Active', 'Inactive']);

function normalizeString(value) {
    const normalized = String(value || '').trim();
    return normalized || null;
}

function validateContactInput(input, options = {}) {
    const partial = Boolean(options.partial);
    const payload = {
        firstName: normalizeString(input?.firstName),
        lastName: normalizeString(input?.lastName),
        email: normalizeString(input?.email),
        phone: normalizeString(input?.phone),
        parentAccountId: normalizeString(input?.parentAccountId ?? input?.accountId),
        jobTitle: normalizeString(input?.jobTitle),
        status: normalizeString(input?.status) || 'Active',
    };

    if (!partial || payload.firstName !== null) {
        if (!payload.firstName) {
            throw new ValidationException('Contact first name is required.');
        }
    }

    if (payload.email && !EMAIL_REGEX.test(payload.email)) {
        throw new ValidationException('Contact email must be a valid email address.');
    }

    if (payload.parentAccountId && !GUID_REGEX.test(payload.parentAccountId)) {
        throw new ValidationException('Parent account id must be a valid GUID.');
    }

    if (!VALID_STATUSES.has(payload.status)) {
        throw new ValidationException('Status must be either Active or Inactive.');
    }

    return payload;
}

module.exports = { validateContactInput };
