const express = require("express");
const { jwtMiddleware } = require("../middlewares/auth.middleware");
const user = require("../controllers/user.controller.js");
const { refreshAccessToken } = require("../utils/jwtToken.utils");
const router = express.Router();

router.get('/getAllUsers',jwtMiddleware, user.getAllUsers);
router.post('/userRegister',jwtMiddleware,user.userRegister);
// router.get('/userLogout', authMiddleware, user.userLogout);

module.exports = {
    path: '/users',
    router: router
};
