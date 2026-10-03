const express = require('express');
const router = express.Router();
const {
  loginUser,
  getUsers,
  getUserProfile,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/login', loginUser);

router.route('/')
  .get(protect, getUsers)
  .post(protect, authorize('Superadmin', 'Admin'), createUser);

router.get('/profile', protect, getUserProfile);

router.route('/:id')
  .put(protect, authorize('Superadmin', 'Admin'), updateUser)
  .delete(protect, authorize('Superadmin', 'Admin'), deleteUser);

module.exports = router;
