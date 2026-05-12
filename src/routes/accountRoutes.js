const express = require('express');
const accountController = require('../controllers/accountController');
const contactController = require('../controllers/contactController');
const { requireRoles } = require('../middleware/requestContextMiddleware');

const router = express.Router();

router.get('/', accountController.listAccounts);
router.get('/:accountId', accountController.getAccountById);
router.get('/:accountId/contacts', contactController.getContactsByAccountId);
router.post('/', requireRoles('salesperson', 'salesmanager', 'admin'), accountController.createAccount);
router.put('/:accountId', requireRoles('salesperson', 'salesmanager', 'admin'), accountController.updateAccount);
router.delete('/:accountId', requireRoles('salesmanager', 'admin'), accountController.deleteAccount);

module.exports = router;
