const express = require("express");
const { jwtMiddleware } = require("../middlewares/auth.middleware");
const geoLocation = require("../controllers/geoLocation.controller.js");
const { refreshAccessToken } = require("../utils/jwtToken.utils");
const router = express.Router();

router.get('/getRegion',jwtMiddleware, geoLocation.getRegion);
// router.get('/userLogout', authMiddleware, user.userLogout);

module.exports = {
    path: '/getLocation',
    router: router
};
