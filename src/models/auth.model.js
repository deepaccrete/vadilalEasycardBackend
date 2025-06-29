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

    getPermissions: async (userId) => {
        return await db.getResults(`SELECT mm.moduleid, mm.modulename, mm.applicablefor, mm.parentmodid, mm.modurl, mm.displayorder, mm.moduleicon
            FROM usermaster um
            JOIN webpermissionpolicymapping wpm ON wpm.policyid = um.policyid AND wpm.isdeleted = 0
            JOIN modulemaster mm ON mm.moduleid = wpm.moduleid AND mm.isdeleted = 0
            WHERE um.isdeleted=0 AND um.userid = ? AND mm.applicablefor = 1 GROUP BY mm.moduleid;`,
            [userId])
    },

    availLocPermission: async (data) => {
        return await db.getResults(`SELECT lm.locationid, lm.locationname, lm.franchisetype FROM userlocation ul JOIN locationmaster lm ON lm.locationid = ul.locationid AND lm.isdeleted = 0 WHERE ul.userid = ? AND ul.companyid = ? AND ul.isdeleted = 0;`, [data.userId, data.companyId]);
    }

}