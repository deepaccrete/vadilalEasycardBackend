const db = require('../../config/db');
const moment = require("moment");
const date = moment();

module.exports = {
    getCompanies: async (query) => {
        let sql = '';
        let params = [];

        if (query.channelId) {
            sql = `SELECT cm.companyid, cm.companyname, CASE WHEN cgm.companyid > 0 THEN 1 ELSE 0 END AS 'isassociated'
            FROM companymaster cm
            LEFT JOIN channelcompanymapping cgm ON cgm.companyid = cm.companyid AND cgm.isdeleted = 0 AND cgm.channelid = ? WHERE cm.isdeleted = 0`;
            params.push(query.channelId);

            if (query.search) {
                sql += ` AND LOWER(cm.companyname) LIKE LOWER(?)`;
                params.push(`%${query.search}%`);
            }

            sql += ` GROUP BY cm.companyid, cm.companyname, cgm.companyid`;
        } else {
            sql = `SELECT cm.companyid, cm.companyname FROM companymaster cm WHERE cm.isdeleted = 0`;

            if (query.search) {
                sql += ` AND LOWER(cm.companyname) LIKE LOWER(?)`;
                params.push(`%${query.search}%`);
            }
        }

        return await db.getResults(sql, params);
    },

    checkCompanyChannelMapping: async (companyId, channelId) => {
        const checkSql = `SELECT channelid FROM channelcompanymapping WHERE companyid = ? AND channelid IN (?)`;
        const existingMappings = await db.getResults(checkSql, [companyId, channelId]);
        const existingChannelIds = existingMappings.map(mapping => mapping.channelid);
        const newChannelIds = channelId?.filter(id => !existingChannelIds.includes(id));
        if (newChannelIds?.length === 0) {
            return { success: 0, msg: 'No new mappings to insert' };
        }
        return newChannelIds;
    },
    companyChannelMapping: async (data) => {

        let sql = `INSERT INTO channelcompanymapping (companyid, channelid) VALUES ?`;
        await db.getResults(sql, [data]);
        return { success: 1, msg: 'Company mapped with channel successfully' };
    }

}