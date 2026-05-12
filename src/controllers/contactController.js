const ApiResponse = require('../responses/ApiResponse');
const contactService = require('../services/contactService');

function isLookupRequest(query) {
    const keys = Object.keys(query || {});
    return String(query.lookup || '').toLowerCase() === 'true' || (keys.length === 1 && keys[0] === 'search');
}

class ContactController {
    async listContacts(req, res, next) {
        try {
            if (isLookupRequest(req.query)) {
                const data = await contactService.lookupContacts(req.query);
                res.json(data);
                return;
            }

            const data = await contactService.listContacts(req.query);
            res.json(ApiResponse.success(null, data));
        } catch (error) {
            next(error);
        }
    }

    async getContactsByAccountId(req, res, next) {
        try {
            const data = await contactService.getContactsByAccountId(req.params.accountId, req.query);
            res.json(ApiResponse.success(null, data));
        } catch (error) {
            next(error);
        }
    }

    async getContactById(req, res, next) {
        try {
            const data = await contactService.getContactById(req.params.contactId);
            res.json(ApiResponse.success(null, data));
        } catch (error) {
            next(error);
        }
    }

    async createContact(req, res, next) {
        try {
            const data = await contactService.createContact(req.body, req.user);
            res.status(201).json(ApiResponse.success('Contact created successfully.', data));
        } catch (error) {
            next(error);
        }
    }

    async updateContact(req, res, next) {
        try {
            const data = await contactService.updateContact(req.params.contactId, req.body, req.user);
            res.json(ApiResponse.success('Contact updated successfully.', data));
        } catch (error) {
            next(error);
        }
    }

    async deleteContact(req, res, next) {
        try {
            await contactService.deleteContact(req.params.contactId, req.user);
            res.json(ApiResponse.success('Contact deleted successfully.'));
        } catch (error) {
            next(error);
        }
    }
}

module.exports = new ContactController();
