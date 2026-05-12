const AppException = require('../exceptions/AppException');
const { isGuid } = require('../utils/guid');

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';
const DEFAULT_ROLE = 'salesmanager';
const DEFAULT_NAME = 'CRM Admin';

function requestContextMiddleware(req, res, next) {
    req.user = {
        id: isGuid(req.header('x-user-id')) ? req.header('x-user-id') : DEFAULT_USER_ID,
        role: String(req.header('x-user-role') || DEFAULT_ROLE).toLowerCase(),
        name: req.header('x-user-name') || DEFAULT_NAME,
    };
    next();
}

function requireRoles(...allowedRoles) {
    const normalized = allowedRoles.map((role) => String(role).toLowerCase());
    return (req, res, next) => {
        const currentRole = String(req.user?.role || '').toLowerCase();
        if (!normalized.includes(currentRole)) {
            return next(new AppException('You do not have permission to perform this action.', 403));
        }
        next();
    };
}

module.exports = {
    requestContextMiddleware,
    requireRoles,
    DEFAULT_USER_ID,
};
