const accountRepository = require('../repositories/accountRepository');
const { validateAccountInput } = require('../validators/accountValidator');
const { toAccountDto, toPagedAccountDto } = require('../dtos/accountDto');
const NotFoundException = require('../exceptions/NotFoundException');
const ValidationException = require('../exceptions/ValidationException');
const { requireGuid } = require('../utils/guid');

class AccountService {
    async listAccounts(query) {
        const result = await accountRepository.list(query);
        return toPagedAccountDto(result);
    }

    async lookupAccounts(query) {
        const result = await accountRepository.list({
            ...query,
            page: 1,
            pageSize: Math.min(Number(query?.pageSize) || 20, 50),
            sortBy: 'name',
            sortDirection: 'asc',
        });
        return toPagedAccountDto(result).items.map((account) => ({
            id: account.accountId,
            name: account.name,
        }));
    }

    async getAccountById(accountId) {
        accountId = requireGuid(accountId, 'Account id');
        const account = await accountRepository.getById(accountId);
        if (!account) {
            throw new NotFoundException('Account not found.');
        }
        return toAccountDto(account);
    }

    async createAccount(input, actor) {
        const payload = validateAccountInput(input);
        const account = await accountRepository.create(payload, actor);
        return toAccountDto(account);
    }

    async updateAccount(accountId, input, actor) {
        accountId = requireGuid(accountId, 'Account id');
        const payload = validateAccountInput(input);
        const account = await accountRepository.update(accountId, payload, actor);
        if (!account) {
            throw new NotFoundException('Account not found.');
        }
        return toAccountDto(account);
    }

    async deleteAccount(accountId, actor) {
        accountId = requireGuid(accountId, 'Account id');
        const hasContacts = await accountRepository.hasContacts(accountId);
        if (hasContacts) {
            throw new ValidationException('Cannot delete account while related contacts exist.');
        }

        const deleted = await accountRepository.delete(accountId, actor);
        if (!deleted) {
            throw new NotFoundException('Account not found.');
        }
    }
}

module.exports = new AccountService();
