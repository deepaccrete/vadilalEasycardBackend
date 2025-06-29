const express = require("express");
const { jwtMiddleware } = require("../../middlewares/auth.middleware");
const approvalNoteList = require("../../controllers/ApprovalNote/approvalNoteList.controller");
const { refreshAccessToken } = require("../../utils/jwtToken.utils");
const router = express.Router();

router.get('/getApprovalListByStatus',jwtMiddleware, approvalNoteList.getApprovalListByStatus);


module.exports = {
    path: '/approvalNoteList',
    router: router
};
