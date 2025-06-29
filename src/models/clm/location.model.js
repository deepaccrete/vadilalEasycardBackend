const db = require('../../config/db');
const moment = require("moment");
const date = moment();

module.exports = {
    getLocation: async (companyId) => {
        return await db.getResults(`SELECT lm.locationid,lm.locationname,lm.franchisetype FROM locationmaster lm JOIN companymaster cm ON cm.companyid=lm.companyid AND cm.isdeleted=0 WHERE lm.isdeleted=0 AND lm.companyid=?;`, [companyId]);
    },

    getFranchiseeLocationList: async (companyId, locationIds) => {
        return await db.getResults(`SELECT lm.locationid,lm.locationname,lm.franchisetype
        FROM locationmaster lm
        JOIN storemaster sm ON sm.locationid=lm.locationid AND sm.isdeleted=0
        WHERE lm.isdeleted=0 AND lm.locationtype=2 AND lm.companyid=? AND lm.locationid IN (?) GROUP BY sm.locationid;`, [companyId, locationIds]);
    }
}