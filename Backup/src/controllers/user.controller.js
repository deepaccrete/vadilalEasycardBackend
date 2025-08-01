const Joi = require("joi");
const jwt = require("jsonwebtoken");
const user = require("../models/user.model");
const jwtUtils = require("../utils/jwtToken.utils");
const errorUtils = require("../utils/errorHandler.utils");
const winston = require("../config/winston");
const crypto = require('crypto');
const { min } = require("moment");

module.exports = {
    getAllUsers : async (req, res) => {
        try {
            const getUsers = await user.getAllUsers();
            res.status(200).json({ success: 1, data: getUsers.data });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
    userRegister : async (req, res) => {
        const schema = Joi.object({
            firstName: Joi.string().trim().min(4).max(100).required(), 
            lastName: Joi.string().trim().min(4).max(100).required(),
            email: Joi.string().trim().email().min(4).max(100).required(),
            password: Joi.string().min(4).max(30).required(),
            roleid: Joi.number().required(),
            designation: Joi.string().required(),
            phoneno: Joi.string().required(),
            isactive:Joi.bool().required()
        });

        const { error } = schema.validate(req.body);
        try {
            if(error) return res.status(400).json({success: 0, msg: error.details[0].message.replace(/"/g, '')});

            const key = Buffer.from('w7fF8EKe5NrK3Ps2V9TskdC5zNWwhzQY', 'utf8'); // 32 bytes (256-bit)
            const iv = Buffer.from('0000000000000000', 'utf8'); // 16 bytes (128-bit)
            
            function encrypt(text) {
                const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
                let encrypted = cipher.update(text, 'utf8', 'base64');
                encrypted += cipher.final('base64');
                return encrypted;
            }
            req.body.password = encrypt(req.body.password);
            const userResp = await user.userRegister(req.body,req.info);
            console.log(userResp);
            if (userResp.success != 1) throw errorUtils.createError(userResp.msg, userResp.success || 400);
            res.status(200).json({ success: 1, userId: userResp.data });

        }catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
}