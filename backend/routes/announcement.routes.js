const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcement.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.post('/', authorize('landlord', 'caretaker'), announcementController.create);
router.get('/apartment/:apartmentId', authorize('landlord', 'caretaker', 'staff'), announcementController.getByApartment);
router.delete('/:id', authorize('landlord'), announcementController.delete);

module.exports = router;
