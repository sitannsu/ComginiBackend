const express = require('express');
const router = express.Router();
const uc = require('../controllers/userProfileController');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

router.put('/update-profile', uc.updateProfile);
router.put('/update-contact', uc.updateContact);
router.put('/update-business', uc.updateBusiness);
router.put('/change-password', uc.changePassword);

module.exports = router;
