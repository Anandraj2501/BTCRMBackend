const accountRepository = require('../repositories/accountRepository');
const contactRepository = require('../repositories/contactRepository');
const { validateContactInput } = require('../validators/contactValidator');
const { toContactDto, toPagedContactDto } = require('../dtos/contactDto');
const NotFoundException = require('../exceptions/NotFoundException');
const { requireGuid } = require('../utils/guid');

class ContactService {
    async listContacts(query) {
        if (query?.accountId) {
            query = { ...query, accountId: requireGuid(query.accountId, 'Account id') };
        }
        const result = await contactRepository.list(query);
        return toPagedContactDto(result);
    }

    async lookupContacts(query) {
        if (query?.accountId) {
            query = { ...query, accountId: requireGuid(query.accountId, 'Account id') };
        }
        const result = await contactRepository.list({
            ...query,
            page: 1,
            pageSize: Math.min(Number(query?.pageSize) || 20, 50),
            sortBy: 'fullName',
            sortDirection: 'asc',
        });
        return toPagedContactDto(result).items.map((contact) => ({
            id: contact.contactId,
            name: contact.fullName,
            email: contact.email,
            parentAccountId: contact.parentAccountId,
            parentAccountName: contact.parentAccountName,
        }));
    }

    async getContactsByAccountId(accountId, query) {
        accountId = requireGuid(accountId, 'Account id');
        const accountExists = await accountRepository.exists(accountId);
        if (!accountExists) {
            throw new NotFoundException('Account not found.');
        }
        const result = await contactRepository.list({ ...query, accountId });
        return toPagedContactDto(result);
    }

    async getContactById(contactId) {
        contactId = requireGuid(contactId, 'Contact id');
        const contact = await contactRepository.getById(contactId);
        if (!contact) {
            throw new NotFoundException('Contact not found.');
        }
        return toContactDto(contact);
    }

    async createContact(input, actor) {
        const payload = validateContactInput(input);
        if (payload.parentAccountId) {
            const accountExists = await accountRepository.exists(payload.parentAccountId);
            if (!accountExists) {
                throw new NotFoundException('Parent account not found.');
            }
        }
        const contact = await contactRepository.create(payload, actor);
        return toContactDto(contact);
    }

    async updateContact(contactId, input, actor) {
        contactId = requireGuid(contactId, 'Contact id');
        const payload = validateContactInput(input);
        if (payload.parentAccountId) {
            const accountExists = await accountRepository.exists(payload.parentAccountId);
            if (!accountExists) {
                throw new NotFoundException('Parent account not found.');
            }
        }
        const contact = await contactRepository.update(contactId, payload, actor);
        if (!contact) {
            throw new NotFoundException('Contact not found.');
        }
        return toContactDto(contact);
    }

    async deleteContact(contactId, actor) {
        contactId = requireGuid(contactId, 'Contact id');
        const deleted = await contactRepository.delete(contactId, actor);
        if (!deleted) {
            throw new NotFoundException('Contact not found.');
        }
    }
}

module.exports = new ContactService();
