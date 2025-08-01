const Joi = require("joi");
const jwt = require("jsonwebtoken");
const auth = require("../models/auth.model");
const jwtUtils = require("../utils/jwtToken.utils");
const errorUtils = require("../utils/errorHandler.utils");
const winston = require("../config/winston");
const crypto = require('crypto');
const { min } = require("moment");

module.exports = {
    userLogin: async (req, res) => {
    const schema = Joi.object({
        email: Joi.string().trim().min(4).max(100).required(),
        password: Joi.string().min(4).max(30).required()
    });

    const { error } = schema.validate(req.body);
    try {
        if(error) return res.status(400).json({success: 0, msg: error.details[0].message.replace(/"/g, '')});
        
        const { email, password } = req.body;
        const key = Buffer.from('w7fF8EKe5NrK3Ps2V9TskdC5zNWwhzQY', 'utf8'); // 32 bytes (256-bit)
        const iv = Buffer.from('0000000000000000', 'utf8'); // 16 bytes (128-bit)
        
        function encrypt(text) {
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            let encrypted = cipher.update(text, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            return encrypted;
        }
        
        var newPassword = encrypt(password);
        
        // Check if user exists and password is correct
        let userResp = await auth.findUser(email, newPassword);
        console.log("userResp >>>>>>>>>>>>>>>>>>>>>>>>", userResp);
        
        if (userResp.success === 0) {
            // Return specific error message from findUser function
            return res.status(401).json({success: 0, msg: userResp.msg});
        }

        const appSettingResp = await auth.getAppSetting();
        if (appSettingResp.success !== 1) throw errorUtils.createError(appSettingResp.msg, 500);

        // Generate access token
        const token = jwtUtils.generateToken({
            userid: userResp.data.userid,
            email: userResp.data.email,
            roleid: userResp.data.roleid,
            role: userResp.data.rolename,
            designation: userResp.data.designation,
            phoneno: userResp.data.phoneno
        });

        userResp.data.token = token;

        res.status(200).json({ 
            success: 1, 
            msg: "Login successful", 
            userData: userResp.data,
            appsetting: appSettingResp.data
        });

    } catch (error) {
        winston.error(error);
        res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
},

    adminUserLogin: async (req, res) => {
    const schema = Joi.object({
        email: Joi.string().trim().min(4).max(100).required(),
        password: Joi.string().min(4).max(30).required()
    });

    const { error } = schema.validate(req.body);
    try {
        if(error) return res.status(400).json({success: 0, msg: error.details[0].message.replace(/"/g, '')});
        
        const { email, password } = req.body;
        const key = Buffer.from('w7fF8EKe5NrK3Ps2V9TskdC5zNWwhzQY', 'utf8'); // 32 bytes (256-bit)
        const iv = Buffer.from('0000000000000000', 'utf8'); // 16 bytes (128-bit)
        
        function encrypt(text) {
            const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
            let encrypted = cipher.update(text, 'utf8', 'base64');
            encrypted += cipher.final('base64');
            return encrypted;
        }
        
        var newPassword = encrypt(password);
        
        // Check if admin user exists and password is correct
        let userResp = await auth.adminUserFind(email, newPassword);
        console.log("userResp >>>>>>>>>>>>>>>>>>>>>>>>", userResp);
        
        if (userResp.success === 0) {
            // Return specific error message from adminUserFind function
            return res.status(401).json({success: 0, msg: userResp.msg});
        }

        const appSettingResp = await auth.getAppSetting();
        if (appSettingResp.success !== 1) throw errorUtils.createError(appSettingResp.msg, 500);

        // Generate access token
        const token = jwtUtils.generateToken({
            userid: userResp.data.userid,
            email: userResp.data.email,
            roleid: userResp.data.roleid,
            role: userResp.data.rolename,
            designation: userResp.data.designation,
            phoneno: userResp.data.phoneno
        });

        userResp.data.token = token;

        res.status(200).json({ 
            success: 1, 
            msg: "Admin login successful", 
            userData: userResp.data,
            appsetting: appSettingResp.data
        });

    } catch (error) {
        winston.error(error);
        res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
},

    userLogout: async (req, res) => {
        try {
            await auth.removeToken(req.headers.authorization.split(" ")[1]);
            await auth.updateLogs(req.auth.userId);

            res.status(200).json({ success: 1, msg: "Logged out successfully" });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
}