const ValidationException = require('../exceptions/ValidationException');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_STATUSES = new Set(['Active', 'Inactive']);
const VALID_ACCOUNT_TYPES = new Set(['Gold', 'Silver', 'Bronze']);

function normalizeString(value) {
    const normalized = String(value || '').trim();
    return normalized || null;
}

function validateAccountInput(input, options = {}) {
    const partial = Boolean(options.partial);
    const payload = {
        name: normalizeString(input?.name),
        accountNumber: normalizeString(input?.accountNumber),
        accountType: normalizeString(input?.accountType) || 'Bronze',
        email: normalizeString(input?.email),
        phone: normalizeString(input?.phone),
        street: normalizeString(input?.address?.street ?? input?.street ?? input?.address),
        city: normalizeString(input?.address?.city ?? input?.city),
        state: normalizeString(input?.address?.state ?? input?.state),
        country: normalizeString(input?.address?.country ?? input?.country),
        zip: normalizeString(input?.address?.zip ?? input?.zip),
        status: normalizeString(input?.status) || 'Active',
    };

    if (!partial || payload.name !== null) {
        if (!payload.name) {
            throw new ValidationException('Account name is required.');
        }
    }

    if (payload.email && !EMAIL_REGEX.test(payload.email)) {
        throw new ValidationException('Account email must be a valid email address.');
    }

    if (!VALID_STATUSES.has(payload.status)) {
        throw new ValidationException('Status must be either Active or Inactive.');
    }

    if (!VALID_ACCOUNT_TYPES.has(payload.accountType)) {
        throw new ValidationException('Account type must be Gold, Silver, or Bronze.');
    }

    return payload;
}

module.exports = { validateAccountInput };
