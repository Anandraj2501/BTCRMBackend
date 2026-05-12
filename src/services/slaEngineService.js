const slaRepository = require('../repositories/slaRepository');
const ValidationException = require('../exceptions/ValidationException');
const { conditionMatches } = require('./conditionEvaluator');

function addMinutes(date, minutes) {
    return new Date(date.getTime() + Number(minutes) * 60 * 1000);
}

class SlaEngineService {
    async calculateForCase(caseInput, account) {
        const createdOn = caseInput.createdOn || new Date();
        const entitlement = await slaRepository.getActiveEntitlementForAccount(caseInput.accountId, createdOn);
        const sla = entitlement
            ? { SLAId: entitlement.SLAId, Name: entitlement.SLAName }
            : await slaRepository.getDefaultSla();

        if (!sla) {
            throw new ValidationException('No active entitlement SLA or default Case SLA is configured.');
        }

        const items = await slaRepository.getSlaItems(sla.SLAId);
        const matchContext = {
            priority: caseInput.priority,
            accountType: account.accounttype || account.accountType || 'Bronze',
        };

        const matchedItem = items.find((item) => conditionMatches(item.ApplicableWhen, matchContext));
        if (!matchedItem) {
            throw new ValidationException('No SLA item matched the case priority and account type.');
        }

        return {
            slaId: sla.SLAId,
            slaName: sla.Name,
            slaItemId: matchedItem.SLAItemId,
            slaItemName: matchedItem.Name,
            firstResponseDueDate: addMinutes(createdOn, matchedItem.FirstResponseTime),
            resolutionDueDate: addMinutes(createdOn, matchedItem.ResolutionTime),
            source: entitlement ? 'Entitlement' : 'Default',
        };
    }
}

module.exports = new SlaEngineService();
