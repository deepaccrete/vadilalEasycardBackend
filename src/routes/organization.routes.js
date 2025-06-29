const express = require("express");
const { jwtMiddleware } = require("../middlewares/auth.middleware");
const organization = require("../controllers/organization.controller.js");
const { refreshAccessToken } = require("../utils/jwtToken.utils");
const router = express.Router();

router.get('/getMinistry',jwtMiddleware, organization.getMinistry);
router.get('/getProjectUnit', jwtMiddleware, organization.getProjectUnit);
router.get('/getDepartment/:ministryId/:unitId', jwtMiddleware, organization.getDepartment);
router.get('/getDesignation/:ministryId/:unitId/:departmentId', jwtMiddleware, organization.getDesignation);
module.exports = {
    path: '/organization',
    router: router
};
