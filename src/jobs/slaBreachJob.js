const caseService = require('../services/caseService');

function startSlaBreachJob(intervalMs = 60 * 1000) {
    const run = async () => {
        try {
            const breachedCount = await caseService.markBreachedCases();
            if (breachedCount > 0) {
                console.log(`SLA breach job marked ${breachedCount} case(s) as Failed.`);
            }
        } catch (error) {
            console.error('SLA breach job failed:', error);
        }
    };

    run();
    return setInterval(run, intervalMs);
}

module.exports = { startSlaBreachJob };
