const db = require('../config/db');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const { MD5 } = require('crypto-js');
const moment = require("moment");
const { getAllUsers } = require('../controllers/user.controller');
const JWT_SECRET = process.env.JWT_SECRET;
const date = moment();

module.exports = {
    getRegion: async () => {
        try {
            // Fetch userid and password
            let res = await db.getResults(`SELECT rm."RegionID" ,rm."RegionName" FROM "RegionMaster" rm WHERE rm."IsDeleted" = false`); 
                                        
            if (!res?.length) return { success: 0, msg: "No Region found" };

            return { success: 1, data: res };
        } catch (error) {
            return { success: 0, msg: error.message, error: error.message };
        }
    },

}