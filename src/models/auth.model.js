const db = require('../config/db');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const { MD5 } = require('crypto-js');
const moment = require("moment");
const JWT_SECRET = process.env.JWT_SECRET;
const date = moment();

module.exports = {

    // Updated findUser function in your model
findUser: async (email, password) => {
    try {
        // First check if user exists with the given email
        let userCheck = await db.getResults(`
            SELECT  u."userid",
                    u."firstname",
                    u."lastname",
                    u."email",
                    u."roleid",
                    r."rolename",
                    u."designation",
                    u."phoneno",
                    u."password"
                FROM "usermaster" u
                JOIN "rolemaster" r ON r."roleid" = u."roleid"
                WHERE u."email" = $1 
                AND u."isdelete" = false 
                AND u."isactive" = true
        `, [email]);
        
        // If no user found with this email
        if (!userCheck?.length) {
            return { success: 0, msg: "User not found" };
        }
        
        const user = userCheck[0];
        
        // Check if password matches
        if (user.password !== password) {
            return { success: 0, msg: "Invalid password" };
        }
        
        // Remove password from response data for security
        delete user.password;
        
        return { success: 1, data: user };
        
    } catch (error) {
        return { success: 0, msg: error.message, error: error.message };
    }
},


    adminUserFind: async (email, password) => {
    try {
        // First check if user exists with the given email and required roles
        let userCheck = await db.getResults(`
            SELECT  u."userid",
                    u."firstname",
                    u."lastname",
                    u."email",
                    u."roleid",
                    r."rolename",
                    u."designation",
                    u."phoneno",
                    u."password"
                FROM "usermaster" u
                JOIN "rolemaster" r ON r."roleid" = u."roleid"
                WHERE u."email" = $1 
                AND u."isdelete" = false 
                AND u."isactive" = true
                AND r."roleid" IN (1, 3)
        `, [email]);
        
        // If no user found with this email and required roles
        if (!userCheck?.length) {
            // Check if user exists but doesn't have admin privileges
            let userExistsCheck = await db.getResults(`
                SELECT u."userid" 
                FROM "usermaster" u
                WHERE u."email" = $1 
                AND u."isdelete" = false 
                AND u."isactive" = true
            `, [email]);
            
            if (userExistsCheck?.length) {
                return { success: 0, msg: "Access denied: Admin privileges required" };
            } else {
                return { success: 0, msg: "User not found" };
            }
        }
        
        const user = userCheck[0];
        
        // Check if password matches
        if (user.password !== password) {
            return { success: 0, msg: "Invalid password" };
        }
        
        // Remove password from response data for security
        delete user.password;
        
        return { success: 1, data: user };
        
    } catch (error) {
        return { success: 0, msg: error.message, error: error.message };
    }
},

    userToken: async (userId) => {
        return await db.getResults(`SELECT ujt.userid, ujt.token FROM user_jwt_tokens ujt WHERE ujt.userid = ?;`, [userId]);
    },

    removeToken: async (token) => {
        await db.getResults(`DELETE FROM user_jwt_tokens WHERE token = ?;`, [token]);
    },

    updateToken: async (userId, token) => {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userTokenObj = {
            userid: userId,
            token: token,
            expiry: moment.unix(decoded.exp).format('YYYY-MM-DD HH:mm:ss'),
        };
        const resp = await db.insert('user_jwt_tokens', userTokenObj);
        return !resp.affectedRows ? { success: 0 } : { success: 1 };
    },

    saveLogs: async (ip, userId) => {
        const logObj = {
            userid: userId,
            login: moment().format('YYYY-MM-DD H:m:s'),
            ip: ip
        };
        const resp = await db.insert('logmst', logObj);
        return !resp.insertId ? { success: 0 } : { success: 1 };
    },

    updateLogs: async (userId) => {
        await db.getResults(`UPDATE logmst SET logOut = ? WHERE userId = ? ORDER BY logId DESC LIMIT 1;`, [moment().format('YYYY-MM-DD H:m:s'), userId]);
    },

    // getUser: async (email, userid) => {
    //     let sql = `SELECT um.userid FROM usermaster um WHERE um.isdeleted = 0`;

    //     if (email) {
    //         sql += ` AND um.email = ?`;
    //     }
    //     if (userid) {
    //         sql += ` AND um.userid = ?`;
    //     }

    //     if (params.length === 0) {
    //         throw new Error('At least one parameter (email or userid) is required.');
    //     }

    //     return await db.getResults(sql, email, userid);
    // },

    getAppSetting: async () => {
  try {
    const res = await db.getResults(`
      SELECT isadd, isdeletecard, isedit, isshare, isaddgroup, isaddtag
      FROM appsetting
      WHERE isdelete = false
      ORDER BY createdat DESC
      LIMIT 1
    `);

    if (!res?.length) {
      return { success: 0, msg: "No active app setting found" };
    }

    return { success: 1, data: res[0] };
  } catch (error) {
    return { success: 0, msg: error.message, error: error.message };
  }
},


}