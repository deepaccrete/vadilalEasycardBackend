const db = require('../config/db');
const moment = require("moment");
const date = moment();

module.exports = {

    getChannelList: async (req) => {

        const { draw, start, length, search, sortField, sortOrder } = req.query;

        let sql = `SELECT cm.channelid, cm.channelname, cm.channelgroupid, cgm.cgname,IFNULL(cgm.inoutbound,0) AS inoutbound, 
             cb.username AS createdby, DATE_FORMAT(cm.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS modifiedby, 
             IFNULL(DATE_FORMAT(cm.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate 
             FROM channelmaster cm  
             JOIN usermaster cb ON cb.userid = cm.createdby
             LEFT JOIN usermaster mb ON mb.userid = cm.modifiedby
             JOIN channelgroupmaster cgm ON cgm.channelgroupid=cm.channelgroupid AND cgm.isdeleted=0 
             WHERE cm.isdeleted=0 `;

        const params = [];

        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(cm.channelname) LIKE LOWER(?) OR LOWER(cgm.cgname) LIKE LOWER(?))`;
            params.push(`%${search}%`, `%${search}%`);
        }

        const allData = await db.getResults(sql, params);

        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY cm.channelid DESC`;
        }

        if (length != -1) {
            sql += ` LIMIT ?, ?`;
            params.push(parseInt(start), parseInt(length));
        }

        const filteredData = await db.getResults(sql, params);

        return {
            "draw": draw,
            "totalFiltered": filteredData.length,
            "totalRecords": allData.length,
            "data": filteredData,
        };

    },

    getData: async (channelId, channelName, findDuplicate) => {

        let sql = `select cm.channelid,cm.channelname,cm.channelgroupid, cgm.cgname,IFNULL(cm.secretkey,'') secretkey,IFNULL(cm.secretvalue,0) secretvalue,
       IFNULL(cm.tokenurl,'') tokenurl,IFNULL(cm.storeaddupdateurl,'')  storeaddupdateurl,IFNULL(cm.storeaction,'')  storeaction,
       IFNULL(cm.menuaddupdate,'')  menuaddupdate,IFNULL(cm.itemaction,'')  itemaction,IFNULL(cm.orderstatusupdate,'')  orderstatusupdate,
       IFNULL(cm.rideraddupdate,'')  rideraddupdate,IFNULL(cm.riderassign,'') riderassign from channelmaster cm JOIN channelgroupmaster cgm
        ON cm.channelgroupid = cgm.channelgroupid AND cgm.isdeleted=0 where cm.isdeleted=0`;

        const params = [];

        if (channelId && channelId > 0) {
            if (findDuplicate) {
                sql += ` AND cm.channelid != ?`;
                params.push(channelId);
            } else {
                sql += ` AND cm.channelid = ?`;
                params.push(channelId);
            }
        }

        if (channelName) {
            sql += ` AND LOWER(cm.channelname) = LOWER(?)`;
            params.push(channelName);
        }

        const data = await db.getResults(sql, params);
        return data;
    },

    createChannel: async (data) => {

        const resp = await db.insert('channelmaster', data);
        return !resp.insertId
            ? { status: 500, success: 0, msg: 'Failed to Insert. Please try Again' }
            : { status: 201, success: 1, msg: 'Channel created successfully.' };
    },

    updateChannel: async (channelId, data) => {

        const sql = `UPDATE channelmaster cm SET ? WHERE cm.isdeleted = 0 AND cm.channelid = ?`;
        const resp = await db.getResults(sql, [data, channelId]);
        return resp.affectedRows > 0
            ? { status: 200, success: 1, msg: "Channel updated successfully." }
            : { status: 500, success: 0, msg: "Failed to update channel." };
    },


    deleteChannel: async (channelId, data) => {
        const sql = `UPDATE channelmaster SET ? WHERE channelid = ?`;
        const resp = await db.getResults(sql, [data, channelId]);
        return resp.affectedRows > 0
            ? { status: 200, success: 1, msg: "Channel deleted successfully." }
            : { status: 500, success: 0, msg: "Failed to delete channel." };
    },
    checkChannelCompanyMapping: async (channelId, companyIds) => {
        const checkSql = `SELECT companyid FROM channelcompanymapping WHERE channelid = ? AND companyid IN (?)`;
        const existingMappings = await db.getResults(checkSql, [channelId, companyIds]);
        const existingCompanyIds = existingMappings.map(mapping => mapping.companyid);
        const newCompanyIds = companyIds?.filter(id => !existingCompanyIds.includes(id));
        if (newCompanyIds?.length === 0) {
            return { success: 0, msg: 'No new mappings to insert' };
        }
        return newCompanyIds;
    },
    channelComapanyMapping: async (data) => {
        let sql = `INSERT INTO channelcompanymapping (channelid, companyid) VALUES ?`;
        try {
            await db.getResults(sql, [data]);
            return { success: 1, msg: 'Channel mapped with company successfully' };
        } catch (error) {
            console.error('SQL Error:', error);
            throw new Error('Database error while mapping channel with company');
        }
    },

    getChannelGroup: async () => {
        return await db.getResults(`SELECT cgm.channelgroupid, cgm.cgname, cgm.inoutbound FROM channelgroupmaster cgm WHERE cgm.isdeleted=0;`);
    }
}