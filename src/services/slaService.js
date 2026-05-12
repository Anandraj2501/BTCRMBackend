const slaRepository = require('../repositories/slaRepository');
const accountRepository = require('../repositories/accountRepository');
const NotFoundException = require('../exceptions/NotFoundException');
const ValidationException = require('../exceptions/ValidationException');
const { mapSla, mapSlaItem, mapEntitlement } = require('../dtos/slaDto');
const { parseCondition } = require('./conditionEvaluator');
const { requireGuid } = require('../utils/guid');

const VALID_STATUSES = new Set(['Active', 'Inactive']);
const VALID_ENTITLEMENT_STATUSES = new Set(['Active', 'Expired']);

function requireString(value, message) {
    const normalized = String(value || '').trim();
    if (!normalized) throw new ValidationException(message);
    return normalized;
}

class SlaService {
    async createSla(input) {
        const payload = {
            name: requireString(input?.name, 'SLA name is required.'),
            isDefault: Boolean(input?.isDefault),
            status: input?.status || 'Active',
        };
        if (!VALID_STATUSES.has(payload.status)) {
            throw new ValidationException('SLA status must be Active or Inactive.');
        }
        return mapSla(await slaRepository.createSla(payload));
    }

    async createSlaItem(input) {
        const slaId = requireGuid(input?.slaId, 'SLA id');
        const sla = await slaRepository.getSlaById(slaId);
        if (!sla) throw new NotFoundException('SLA not found.');

        const firstResponseTime = Number(input?.firstResponseTime);
        const resolutionTime = Number(input?.resolutionTime);
        if (!Number.isInteger(firstResponseTime) || firstResponseTime <= 0) {
            throw new ValidationException('First response time must be a positive integer in minutes.');
        }
        if (!Number.isInteger(resolutionTime) || resolutionTime <= 0) {
            throw new ValidationException('Resolution time must be a positive integer in minutes.');
        }

        const payload = {
            slaId,
            name: requireString(input?.name, 'SLA item name is required.'),
            applicableWhen: parseCondition(input?.applicableWhen || {}),
            firstResponseTime,
            resolutionTime,
            sortOrder: Number(input?.sortOrder) || 0,
        };
        return mapSlaItem(await slaRepository.createSlaItem(payload));
    }

    async createEntitlement(input) {
        const accountId = requireGuid(input?.accountId, 'Account id');
        const slaId = requireGuid(input?.slaId, 'SLA id');

        const accountExists = await accountRepository.exists(accountId);
        if (!accountExists) throw new NotFoundException('Account not found.');

        const sla = await slaRepository.getSlaById(slaId);
        if (!sla) throw new NotFoundException('SLA not found.');

        const startDate = new Date(input?.startDate);
        const endDate = new Date(input?.endDate);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()) || endDate <= startDate) {
            throw new ValidationException('Entitlement start and end dates must be valid, with EndDate after StartDate.');
        }

        const status = input?.status || 'Active';
        if (!VALID_ENTITLEMENT_STATUSES.has(status)) {
            throw new ValidationException('Entitlement status must be Active or Expired.');
        }

        return mapEntitlement(await slaRepository.createEntitlement({
            accountId,
            slaId,
            startDate,
            endDate,
            status,
        }));
    }
}

module.exports = new SlaService();
