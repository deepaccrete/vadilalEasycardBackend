const db = require('../config/db');
const moment = require('moment');

module.exports = {
  setAppSettings: async (settings, info) => {
  const client = await db.pool.connect();
  try {
    await db.beginTransaction(client);

    // Soft delete existing records
    await client.query(
      `UPDATE appsetting
       SET isdelete = true, updatedby = $1, updatedat = NOW()
       WHERE isdelete = false`,
      [info.userid]
    );

    // Insert new settings record
    await client.query(
      `INSERT INTO appsetting (
        isadd, isdeletecard, isedit, isshare, isaddgroup, isaddtag,
        createdby, createdat, isdelete
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), false)`,
      [
        settings.isadd,
        settings.isdeletecard,
        settings.isedit,
        settings.isshare,
        settings.isaddgroup,
        settings.isaddtag,
        info.userid
      ]
    );

    await db.commit(client);
    return { success: 1 };
  } catch (error) {
    await db.rollback(client);
    return { success: 0, msg: error.message };
  } finally {
    client.release();
  }
},
getAppSettings: async () => {
  try {
    const result = await db.getResults(
      `SELECT addsettingid, isadd, isdeletecard, isedit, isshare, isaddgroup, isaddtag, createdby, createdat
       FROM appsetting
       WHERE isdelete = false
       ORDER BY createdat DESC
       LIMIT 1`
    );

    if (result.length === 0) {
      return { success: 0, msg: "No active settings found" };
    }

    return { success: 1, data: result[0] };
  } catch (error) {
    return { success: 0, msg: error.message };
  }
}


};
