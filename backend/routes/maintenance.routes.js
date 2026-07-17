const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenance.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.post('/', authorize('landlord', 'caretaker', 'tenant'), maintenanceController.create);
router.get('/apartment/:apartmentId', authorize('landlord', 'caretaker'), maintenanceController.getByApartment);
router.get('/my-requests', authorize('tenant'), maintenanceController.getMyRequests);
router.get('/:id', authorize('landlord', 'caretaker', 'tenant'), maintenanceController.getById);
router.put('/:id', authorize('landlord', 'caretaker'), maintenanceController.update);
router.delete('/:id', authorize('landlord'), maintenanceController.delete);

module.exports = router;
