const db = require("../../config/db.js");
const moment = require("moment");



module.exports = {

    getOnlineMenuList: async (req) => {
        const { draw, start, length, search, sortField, sortOrder } = req.query;
    
        let sql = `SELECT sm.storeid,mm.menuid, mm.menuname, sm.storename, sm.locationid, sm.activestore, IFNULL(DATE_FORMAT(sm.createddate, '%d-%m-%Y %r'), '') AS createddate, IFNULL(cb.username, '') AS createdby, IFNULL(DATE_FORMAT(sm.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate, IFNULL(mb.username, '') AS modifiedby, 
                    JSON_ARRAYAGG(
                        JSON_OBJECT(
                        'channelid', cm.channelid, 
                        'channelname', cm.channelname, 
                        'associatedproducts', (SELECT COUNT(DISTINCT omd.productid) 
                                                FROM onlinemenudetails omd 
                                                WHERE omd.channelid = cm.channelid 
                                                AND omd.locationid = sm.locationid 
                                                AND omd.isdeleted = 0))) AS channels 
                    FROM storemaster sm 
                    JOIN menumaster mm ON mm.menuid = sm.menuid AND mm.isdeleted = 0 
                    JOIN channelmaster cm ON cm.channelid = sm.channelid  and cm.isdeleted = 0
                    JOIN usermaster cb ON cb.userid = sm.createdby 
                    LEFT JOIN usermaster mb ON mb.userid = sm.modifiedby 
                    WHERE sm.companyid = ? AND sm.locationid IN (?) AND sm.isdeleted = 0 `;
    
        const params = [req.body.companyId,req.body.locationIds];
        
        
        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(mm.menuname) LIKE LOWER(?) OR LOWER(sm.storename) LIKE LOWER(?) OR LOWER(cm.channelname) LIKE LOWER(?))`;
            params.push(`%${search}%`,`%${search}%`,`%${search}%`);
        }
        
        sql+=`GROUP BY sm.locationid`;
        
        const allData = await db.getResults(sql, params);

        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY mm.menuid DESC`; 
        }
    
    
        if (length != -1) {
            sql += ` LIMIT ?, ?`;
            params.push(parseInt(start), parseInt(length));
        }
    
        const filteredData = await db.getResults(sql, params);
    
        return {
            totalFiltered: filteredData.length,
            totalRecords: allData.length,
            data: filteredData,
        };
    },

    updateOnlineMenuList:async (value,userId,ip)=>{

        const { activeStore, companyId,locationId} = value;

        updateOnlineMenuListObj={
            activeStore,
            modifiedby: userId,
            modifieddate: moment().format("YYYY-MM-DD H:m:s"),
            ipaddress:ip
        }

        let sql = `update storemaster set ? where companyid = ? and locationid = ? and isdeleted = 0`;

        const resp = await db.getResults(sql,[updateOnlineMenuListObj,companyId,locationId]);
        
        if (!resp.affectedRows) {
            return { status: 500, success: 0, msg: "Store not updated." };
        }else{
            return { status: 200, success: 1, msg: "Store updated successfully." };
        }
    }
}