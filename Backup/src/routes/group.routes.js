const express = require("express");
const { jwtMiddleware } = require("../middlewares/auth.middleware");
const groupcontroller = require("../controllers/group.controller.js");
const { refreshAccessToken } = require("../utils/jwtToken.utils");
const router = express.Router();

router.post('/insertgroup',jwtMiddleware,groupcontroller.insertgroup)
router.get('/getgroup', groupcontroller.getgroup);

module.exports = {
    path: '/group',
    router: router
};
