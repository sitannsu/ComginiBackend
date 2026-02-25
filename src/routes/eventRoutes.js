const express = require('express');
const router = express.Router();
const ec = require('../controllers/eventController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.get('/', ec.getEvents);
router.get('/:id', ec.getEventById);
router.post('/', ec.createEvent);
router.put('/:id', ec.updateEvent);
router.delete('/:id', ec.deleteEvent);
router.put('/:eventId/respond', ec.respondToEvent);

module.exports = router;
