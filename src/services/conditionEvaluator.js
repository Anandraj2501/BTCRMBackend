function normalize(value) {
    return String(value || '').trim().toLowerCase();
}

function parseCondition(condition) {
    if (!condition) return {};
    if (typeof condition === 'object') return condition;
    return JSON.parse(condition);
}

function conditionMatches(condition, context) {
    const parsed = parseCondition(condition);

    if (parsed.priority && normalize(parsed.priority) !== normalize(context.priority)) {
        return false;
    }

    if (parsed.accountType && normalize(parsed.accountType) !== normalize(context.accountType)) {
        return false;
    }

    return true;
}

module.exports = {
    conditionMatches,
    parseCondition,
};
