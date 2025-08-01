const express = require("express");
const { jwtMiddleware } = require("../middlewares/auth.middleware");
const appsettingcontroller = require("../controllers/appSetting.controller.js");
const { refreshAccessToken } = require("../utils/jwtToken.utils");
const router = express.Router();

router.post('/setappsettings', jwtMiddleware, appsettingcontroller.setAppSettings);
router.get('/getappsettings', jwtMiddleware, appsettingcontroller.getAppSettings);


module.exports = {
    path: '/appsetting',
    router: router
};
