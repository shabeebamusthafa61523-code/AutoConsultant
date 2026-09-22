const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'benz_jwt_secret_2026', {
    expiresIn: '30d'
  });
};

module.exports = generateToken;
