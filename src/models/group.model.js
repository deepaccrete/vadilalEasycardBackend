const db = require('../config/db');
const moment = require('moment');
const { getgroup } = require('../controllers/group.controller');

module.exports = {
    insertgroup: async (body, info) => {
        try {
            let getGroup = await db.getResults(`select * from groupmaster where groupname = '${body.groupname}'`);
            if (getGroup?.length != 0) {
                return { success: 409, msg: "Groug already exists" };
            }


            // Fetch userid and password
            let res = await db.getResults(`INSERT INTO groupmaster (groupname, createdby, createdat)
                                         VALUES ($1, $2, $3)
                                        RETURNING *;`, [body.groupname, info.userid, new Date()]);

            if (res.rows.length === 0) {
                return { success: 0, message: "Not inserted" };
            } else {
                return { success: 1, data: res.rows[0] };
            }

            return { success: 1, data: res };
        } catch (error) {
            return { success: 0, msg: error.message, error: error.message };
        }
    },

    getgroup: async () => {
        try {
            // Fetch userid and password
            let res = await db.getResults(`select g.groupid ,g.groupname from groupmaster g `);
            if (!res?.length) return { success: 404, msg: "No group found" };
            return { success: 1, data: res };
        } catch (error) {
            return { success: 0, msg: error.message, error: error.message };
        }
    },

}