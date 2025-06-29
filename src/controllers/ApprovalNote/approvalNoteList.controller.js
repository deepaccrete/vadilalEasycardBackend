const Joi = require("joi");
const jwt = require("jsonwebtoken");
const approvalNoteList = require("../../models/ApprovalNote/approvalNoteList.models");
const jwtUtils = require("../../utils/jwtToken.utils");
const errorUtils = require("../../utils/errorHandler.utils");
const winston = require("../../config/winston");
const crypto = require('crypto');
const { min } = require("moment");

module.exports = {

    getApprovalListByStatus : async (req, res) => {
        console.log("getApprovalListByStatus",req.query);
        const schema = Joi.object({
            status: Joi.number().required(),
            fromDate: Joi.string().pattern(/^([0-2][0-9]|(3)[0-1])\/(0[1-9]|1[0-2])\/\d{4}$/).required(),
            toDate: Joi.string().pattern(/^([0-2][0-9]|(3)[0-1])\/(0[1-9]|1[0-2])\/\d{4}$/).required()
        });

        const { error } = schema.validate(req.query);
        try {
            if(error) return res.status(400).json({success: 0, msg: error.details[0].message.replace(/"/g, '')});

            const userResp = await approvalNoteList.getApprovalListByStatus(req.query,req.info);
            console.log(userResp);
            if (userResp.success != 1) throw errorUtils.createError(userResp.msg, userResp.success || 400);
            res.status(200).json({ success: 1, userId: userResp.data });

        }catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
}