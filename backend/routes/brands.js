const express = require('express');
const router = express.Router();
const { authenticateToken, requireTenant } = require('../middleware/auth');
const brandController = require('../controllers/brandController');

// Apply authentication and tenant middleware to all routes
router.use(authenticateToken);
router.use(requireTenant);

// Brand CRUD routes
router.get('/', brandController.getBrands);
router.get('/available-agents', brandController.getAvailableAgents);
router.get('/:id', brandController.getBrand);
router.post('/', brandController.createBrand);
router.put('/:id', brandController.updateBrand);
router.delete('/:id', brandController.deleteBrand);

// Agent assignment routes
router.post('/:id/assign-agents', brandController.assignAgents);

// Widget key management
router.post('/:id/generate-widget-key', brandController.generateWidgetKey);

module.exports = router;
