const express = require('express');
const { register, login, trackActivity } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.patch('/activity', protect, trackActivity);

module.exports = router;
