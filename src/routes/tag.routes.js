const express = require("express");
const { jwtMiddleware } = require("../middlewares/auth.middleware");
const tagcontroller = require("../controllers/tag.controller.js");
const { refreshAccessToken } = require("../utils/jwtToken.utils");
const router = express.Router();


router.post('/inserttag',jwtMiddleware,tagcontroller.insertgroup)
router.get('/gettag',jwtMiddleware, tagcontroller.getgroup);

module.exports = {
    path: '/tag',
    router: router
};
