const Joi = require("joi");
const jwt = require("jsonwebtoken");
const user = require("../models/user.model");
const jwtUtils = require("../utils/jwtToken.utils");
const errorUtils = require("../utils/errorHandler.utils");
const winston = require("../config/winston");
const crypto = require('crypto');
const { min } = require("moment");

module.exports = {
    getAllUsers: async (req, res) => {
    try {
        const userDetails = await user.getAllUsers();
        
        if (userDetails.success !== 1) {
            return res.status(userDetails.success === 0 ? 404 : 500).json({ 
                success: 0, 
                msg: userDetails.msg 
            });
        }
        res.status(200).json({ success: 1, data: userDetails.data });
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
        console.log("---------------------------- 0.1",req.body);
        
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
            console.log("we are here ---------------------1");
            
            const userResp = await user.userRegister(req.body,req.info);
            console.log(userResp);
            if (userResp.success != 1) throw errorUtils.createError(userResp.msg, userResp.success || 400);
            res.status(200).json({ success: 1, userId: userResp.data });

        }catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    updateUser: async (req, res) => {
    const schema = Joi.object({
        userid: Joi.number().required(),
        firstName: Joi.string().trim().min(4).max(100).required(), 
        lastName: Joi.string().trim().min(4).max(100).required(),
        email: Joi.string().trim().email().min(4).max(100).required(),
        password: Joi.string().min(4).max(30).optional(), // Optional for update
        roleid: Joi.number().required(),
        designation: Joi.string().required(),
        phoneno: Joi.string().required(),
        isactive: Joi.bool().required()
    });

    const { error } = schema.validate(req.body);
    try {
        if(error) return res.status(400).json({success: 0, msg: error.details[0].message.replace(/"/g, '')});
        console.log("we are in edit -----------------------");
        
        // Encrypt password if provided
        if (req.body.password) {
            const key = Buffer.from('w7fF8EKe5NrK3Ps2V9TskdC5zNWwhzQY', 'utf8'); // 32 bytes (256-bit)
            const iv = Buffer.from('0000000000000000', 'utf8'); // 16 bytes (128-bit)
            
            function encrypt(text) {
                const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
                let encrypted = cipher.update(text, 'utf8', 'base64');
                encrypted += cipher.final('base64');
                return encrypted;
            }
            req.body.password = encrypt(req.body.password);
        }

        const userResp = await user.updateUser(req.body, req.info);
        
        if (userResp.success != 1) throw errorUtils.createError(userResp.msg, userResp.statusCode || 400);
        
        res.status(200).json({ success: 1, msg: "User updated successfully", userId: req.body.userid });

    } catch (error) {
        winston.error(error);
        res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
    },

    deleteUser: async (req, res) => {
  try {
    const userid = req.params.userid;

    if (!userid) {
      return res.status(400).json({ success: 0, msg: "userid is required" });
    }

    const result = await user.deleteUserById(userid, req.info);

    if (result.success !== 1) {
      throw new Error(result.msg);
    }

    res.status(200).json({ success: 1, msg: "User deleted successfully" });
  } catch (error) {
    winston.error(error);
    res.status(500).json({ success: 0, msg: error.message });
  }
}
}