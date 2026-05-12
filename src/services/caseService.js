const accountRepository = require('../repositories/accountRepository');
const contactRepository = require('../repositories/contactRepository');
const caseRepository = require('../repositories/caseRepository');
const slaEngineService = require('./slaEngineService');
const { toCaseDto, toPagedCaseDto } = require('../dtos/caseDto');
const NotFoundException = require('../exceptions/NotFoundException');
const ValidationException = require('../exceptions/ValidationException');
const { requireGuid } = require('../utils/guid');

const VALID_PRIORITIES = new Set(['Low', 'Medium', 'High']);
const VALID_STATUSES = new Set(['Active', 'Resolved', 'Cancelled']);

function normalizeString(value) {
    const normalized = String(value || '').trim();
    return normalized || null;
}

class CaseService {
    async listCases(query) {
        return toPagedCaseDto(await caseRepository.list(query));
    }

    async getCaseById(caseId) {
        caseId = requireGuid(caseId, 'Case id');
        const record = await caseRepository.getById(caseId);
        if (!record) throw new NotFoundException('Case not found.');
        return toCaseDto(record);
    }

    async createCase(input) {
        const payload = {
            title: normalizeString(input?.title ?? input?.Title),
            description: normalizeString(input?.description ?? input?.Description),
            priority: normalizeString(input?.priority ?? input?.Priority) || 'Medium',
            status: normalizeString(input?.status ?? input?.Status) || 'Active',
            accountId: normalizeString(input?.accountId ?? input?.AccountId),
            contactId: normalizeString(input?.contactId ?? input?.ContactId),
        };

        if (!payload.title) throw new ValidationException('Case title is required.');
        if (!VALID_PRIORITIES.has(payload.priority)) {
            throw new ValidationException('Priority must be Low, Medium, or High.');
        }
        if (!VALID_STATUSES.has(payload.status)) {
            throw new ValidationException('Case status must be Active, Resolved, or Cancelled.');
        }

        if (payload.contactId) {
            payload.contactId = requireGuid(payload.contactId, 'Contact id');
            const contact = await contactRepository.getById(payload.contactId);
            if (!contact) throw new NotFoundException('Contact not found.');
            if (!payload.accountId && contact.parentaccountid) {
                payload.accountId = contact.parentaccountid;
            }
        }

        if (!payload.accountId) throw new ValidationException('Case AccountId is required.');
        payload.accountId = requireGuid(payload.accountId, 'Account id');

        const account = await accountRepository.getById(payload.accountId);
        if (!account) throw new NotFoundException('Account not found.');

        if (payload.contactId) {
            const contact = await contactRepository.getById(payload.contactId);
            if (contact.parentaccountid && contact.parentaccountid.toLowerCase() !== payload.accountId.toLowerCase()) {
                throw new ValidationException('Selected contact belongs to a different account.');
            }
        }

        const slaResult = await slaEngineService.calculateForCase(payload, account);
        return toCaseDto(await caseRepository.create(payload, slaResult));
    }

    async markBreachedCases() {
        return caseRepository.markBreached();
    }

    async recordFirstResponse(caseId) {
        caseId = requireGuid(caseId, 'Case id');
        const record = await caseRepository.recordFirstResponse(caseId);
        if (!record) throw new NotFoundException('Case not found.');
        return toCaseDto(record);
    }

    async resolveCase(caseId) {
        caseId = requireGuid(caseId, 'Case id');
        const record = await caseRepository.resolve(caseId);
        if (!record) throw new NotFoundException('Case not found.');
        return toCaseDto(record);
    }
}

module.exports = new CaseService();
