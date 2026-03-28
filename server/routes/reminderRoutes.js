const express = require('express');
const { evaluateOne, evaluateAll } = require('../controllers/reminderController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.post('/evaluate/:invoiceId', evaluateOne);
router.post('/evaluate-all', evaluateAll);

module.exports = router;
