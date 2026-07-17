const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenant.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.post('/', authorize('landlord', 'caretaker'), tenantController.create);
router.get('/', authorize('landlord', 'caretaker'), tenantController.getAll);
router.get('/:id', authorize('landlord', 'caretaker', 'tenant'), tenantController.getById);
router.put('/:id', authorize('landlord', 'caretaker'), tenantController.update);
router.delete('/:id', authorize('landlord'), tenantController.delete);
router.get('/:id/payments', authorize('landlord', 'caretaker', 'tenant'), tenantController.getPayments);

module.exports = router;
