const ApiResponse = require('../responses/ApiResponse');
const accountService = require('../services/accountService');

function isLookupRequest(query) {
    const keys = Object.keys(query || {});
    return String(query.lookup || '').toLowerCase() === 'true' || (keys.length === 1 && keys[0] === 'search');
}

class AccountController {
    async listAccounts(req, res, next) {
        try {
            if (isLookupRequest(req.query)) {
                const data = await accountService.lookupAccounts(req.query);
                res.json(data);
                return;
            }

            const data = await accountService.listAccounts(req.query);
            res.json(ApiResponse.success(null, data));
        } catch (error) {
            next(error);
        }
    }

    async getAccountById(req, res, next) {
        try {
            const data = await accountService.getAccountById(req.params.accountId);
            res.json(ApiResponse.success(null, data));
        } catch (error) {
            next(error);
        }
    }

    async createAccount(req, res, next) {
        try {
            const data = await accountService.createAccount(req.body, req.user);
            res.status(201).json(ApiResponse.success('Account created successfully.', data));
        } catch (error) {
            next(error);
        }
    }

    async updateAccount(req, res, next) {
        try {
            const data = await accountService.updateAccount(req.params.accountId, req.body, req.user);
            res.json(ApiResponse.success('Account updated successfully.', data));
        } catch (error) {
            next(error);
        }
    }

    async deleteAccount(req, res, next) {
        try {
            await accountService.deleteAccount(req.params.accountId, req.user);
            res.json(ApiResponse.success('Account deleted successfully.'));
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new AccountController();
