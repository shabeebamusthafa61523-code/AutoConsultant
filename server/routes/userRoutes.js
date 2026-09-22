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
const { protect } = require('../middleware/authMiddleware');

router.post('/login', loginUser);

router.route('/')
  .get(protect, getUsers)
  .post(protect, createUser);

router.get('/profile', protect, getUserProfile);

router.route('/:id')
  .put(protect, updateUser)
  .delete(protect, deleteUser);

module.exports = router;
