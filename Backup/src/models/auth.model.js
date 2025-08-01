const db = require('../config/db');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const { MD5 } = require('crypto-js');
const moment = require("moment");
const JWT_SECRET = process.env.JWT_SECRET;
const date = moment();

module.exports = {
    findUser: async (email, password) => {
        
        try {
            // Fetch userid and password
            let res = await db.getResults(`
                                                SELECT  u."userid",
                                                        u."firstname",
                                                        u."lastname",
                                                        u."email",
                                                        u."roleid",
                                                        r."rolename",
                                                        u."designation",
                                                        u."phoneno"
                                                    FROM "usermaster" u
                                                    JOIN "rolemaster" r ON r."roleid" = u."roleid"
                                                    WHERE u."email" = $1 
                                                    AND u."password" = $2 
                                                    AND u."isdelete" = false 
                                                    AND u."isactive" = true
                                            `, [email,password]);
                                        
            if (!res?.length) return { success: 0, msg: "User not found" };

            const user = res[0];
            // if (user.email !== email) return { success: 0, msg: "Invalid Authentication" }
            // if (!user.Password?.length) return { success: 0, msg: "Invalid Authentication" };
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