const express = require('express');
const router = express.Router();
const cleaningController = require('../controllers/cleaning.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/role.middleware');

// All cleaning routes require authentication
router.use(authenticate);

// =============================================
// TASKS
// =============================================
router.get('/tasks',              authorize('staff'), cleaningController.getMyTasks);
router.get('/tasks/today',        authorize('staff'), cleaningController.getTodayTasks);
router.get('/tasks/:id',          authorize('staff'), cleaningController.getTaskById);
router.put('/tasks/:id/status',   authorize('staff'), cleaningController.updateTaskStatus);
router.put('/tasks/:id/accept',   authorize('staff'), cleaningController.acceptMoveOutTask);

// =============================================
// TEAM VIEW (other cleaners in same apartment)
// =============================================
router.get('/team', authorize('staff'), cleaningController.getTeamView);

// =============================================
// SUPPLIES
// =============================================
router.get('/supplies',               authorize('staff'), cleaningController.getSupplies);
router.post('/supplies/request',      authorize('staff'), cleaningController.requestSupplies);
router.get('/supplies/requests',      authorize('staff'), cleaningController.getMySupplyRequests);

// =============================================
// SALARY HISTORY
// =============================================
router.get('/salaries', authorize('staff'), cleaningController.getMySalaryHistory);

// =============================================
// CARETAKER INFO (for chat)
// =============================================
router.get('/caretaker', authorize('staff'), cleaningController.getMyCaretaker);

// =============================================
// MESSAGES WITH CARETAKER
// =============================================
router.get('/messages',               authorize('staff'), cleaningController.getMessages);
router.post('/messages',              authorize('staff'), cleaningController.sendMessage);
router.put('/messages/:id/read',      authorize('staff'), cleaningController.markMessageRead);

// =============================================
// NOTIFICATIONS (optional, for built‑in alerts)
// =============================================
router.get('/notifications',          authorize('staff'), cleaningController.getNotifications);
router.put('/notifications/:id/read', authorize('staff'), cleaningController.markNotificationRead);
router.put('/notifications/read-all', authorize('staff'), cleaningController.markAllRead);

module.exports = router;
