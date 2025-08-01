const express = require("express");
const { jwtMiddleware } = require("../middlewares/auth.middleware");
const dashboardController = require("../controllers/dashboard.controller.js");
const { refreshAccessToken } = require("../utils/jwtToken.utils");
const router = express.Router();

router.get('/getDashboardAnalytics', jwtMiddleware, dashboardController.getDashboardAnalytics);

module.exports = {
    path: '/dashboard',
    router: router
};
