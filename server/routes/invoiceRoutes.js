const express = require('express');
const { create, getAll, getById, updateStatus, remove } = require('../controllers/invoiceController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.route('/').get(getAll).post(create);
router.route('/:id').get(getById).delete(remove);
router.patch('/:id/status', updateStatus);

module.exports = router;
