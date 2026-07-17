const express = require('express');
const router = express.Router();
const rentController = require('../controllers/rent.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

router.use(authenticate);

router.post('/', authorize('landlord', 'caretaker'), rentController.create);
router.get('/apartment/:apartmentId', authorize('landlord', 'caretaker'), rentController.getByApartment);
router.get('/arrears/:tenantId', authorize('landlord', 'caretaker', 'tenant'), rentController.getArrears);
router.get('/:id', authorize('landlord', 'caretaker', 'tenant'), rentController.getById);
router.put('/:id', authorize('landlord', 'caretaker'), rentController.update);
router.delete('/:id', authorize('landlord'), rentController.delete);

module.exports = router;
