const db = require('../../config/db');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const { MD5 } = require('crypto-js');
const moment = require("moment");
const { getAllUsers } = require('../../controllers/user.controller');
const JWT_SECRET = process.env.JWT_SECRET;
const date = moment();

module.exports = {
    getApprovalListByStatus: async (body, info) => {
        try {
        
        } catch (error) {
            return { success: 0, msg: error.message, error: error.message };
        }
    },

}