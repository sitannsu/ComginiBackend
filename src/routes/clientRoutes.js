const express = require('express');
const router = express.Router();
const cc = require('../controllers/clientController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', cc.getClients);
router.get('/primary-contacts', cc.getPrimaryContacts);
router.get('/:id', cc.getClientById);
router.post('/', cc.createClient);
router.put('/:id', cc.updateClient);
router.delete('/:id', cc.deleteClient);

// Client Contacts
router.post('/:clientId/contacts', cc.addContact);
router.delete('/:clientId/contacts/:contactId', cc.deleteContact);

module.exports = router;
