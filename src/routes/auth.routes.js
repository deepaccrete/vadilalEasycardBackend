const express = require("express");
const { authMiddleware } = require("../middlewares/auth.middleware");
const auth = require("../controllers/auth.controller.js");
const { refreshAccessToken } = require("../utils/jwtToken.utils");
const router = express.Router();

router.post('/login', auth.userLogin);
router.get('/logout', authMiddleware, auth.userLogout);

module.exports = {
    path: '/auth',
    router: router
};
