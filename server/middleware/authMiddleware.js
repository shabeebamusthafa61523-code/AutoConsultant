const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'benz_jwt_secret_2026');

      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user || req.user.status === 'Inactive') {
        res.status(401);
        throw new Error('User account is inactive or not found.');
      }

      next();
    } catch (error) {
      console.error('Auth verification failed:', error.message);
      res.status(401);
      next(new Error('Not authorized, token failed'));
    }
  } else {
    res.status(401);
    next(new Error('Not authorized, no token provided'));
  }
};

module.exports = { protect };
