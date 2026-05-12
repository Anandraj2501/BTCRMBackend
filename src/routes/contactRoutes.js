const express = require('express');
const contactController = require('../controllers/contactController');
const { requireRoles } = require('../middleware/requestContextMiddleware');

const router = express.Router();

router.get('/', contactController.listContacts);
router.get('/:contactId', contactController.getContactById);
router.post('/', requireRoles('salesperson', 'salesmanager', 'admin'), contactController.createContact);
router.put('/:contactId', requireRoles('salesperson', 'salesmanager', 'admin'), contactController.updateContact);
router.delete('/:contactId', requireRoles('salesmanager', 'admin'), contactController.deleteContact);

module.exports = router;
