const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const authController = require('../controllers/auth.controller');

// Login
router.post('/login', authController.login);
router.get('/verify', authController.verifyToken); // ← Agrega esta línea

module.exports = router;