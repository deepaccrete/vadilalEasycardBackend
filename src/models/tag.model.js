const db = require('../config/db');


module.exports = {
    inserttag: async (body, info) => {
        try {
            let getGroup = await db.getResults(`select * from tagmaster t where t.tagname = $1`, [body.tagname]);
            if (getGroup?.length != 0) {
                return { success: 409, msg: "Tag already exists" };
            }

            // Fetch userid and password
            let res = await db.getResults(`INSERT INTO tagmaster (tagname, createdby, createdat)
                                         VALUES ($1, $2, $3)
                                        RETURNING *;`, [body.tagname, info.userid]);
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

    gettag: async () => {
        try {
            // Fetch userid and password
            let res = await db.getResults(`select t.tagid ,t.tagname from tagmaster t `);
            if (!res?.length) return { success: 404, msg: "No Tag found" };
            return { success: 1, data: res };
        } catch (error) {
            return { success: 0, msg: error.message, error: error.message };
        }
    },

}