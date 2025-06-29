const db = require('../config/db');
const moment = require('moment');

module.exports = {

    getPosList: async (req) => {

        const { draw, start, length, search, sortField, sortOrder } = req.query;
        const { companyId } = req.body;

        let sql = `SELECT pm.posid, pm.posname, lm.locationid, lm.locationname, mm.menuname,cb.username AS createdby, DATE_FORMAT(pm.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS modifiedby, IFNULL(DATE_FORMAT(pm.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate
                   FROM posmaster pm
                   JOIN menumaster mm ON pm.defaultmenuid=mm.menuid AND mm.isdeleted=0 
                   JOIN locationmaster lm ON lm.locationid=pm.locationid AND lm.isdeleted=0
                   JOIN usermaster cb ON cb.userid = pm.createdby
                   LEFT JOIN usermaster mb ON mb.userid = pm.modifiedby
                   WHERE pm.isdeleted=0 AND pm.companyid=?`;
        
        const params = [companyId];
        const allData = await db.getResults(sql, params);

        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(pm.posname) LIKE LOWER(?) OR LOWER(mm.menuname) LIKE LOWER(?))`;
            params.push(`%${search}%`, `%${search}%`);
        }


        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY pm.posid DESC`;
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

 getData: async (posId, companyId, posName, findDuplicate, roleId) => {
        let sql = `SELECT cm.companyid, cm.companyname,pm.posid,pm.posname, pm.locationid, pm.defaultmenuid, pm.invoicemsg, pm.isactive, pm.posuniquekey, pm.posoptions`
        if (roleId==0) {
            sql += `,pm.mysqlpass,pm.expirydate`;
        }
        sql += ` FROM posmaster pm
        JOIN companymaster cm ON cm.companyid=pm.companyid AND cm.isdeleted=0
        WHERE pm.isdeleted=0`;
        const params = [];

        if (posId && posId > 0) {
            if (findDuplicate) {
                sql += ` AND pm.posid != ?`;
                params.push(posId);
            } else {
                sql += ` AND pm.posid = ?`;
                params.push(posId);
            }
        }

        if (companyId && roleId !== 0) {
            sql += ` AND pm.companyid = ?`;
            params.push(companyId);
        }
        if (posName) {
            sql += ` AND LOWER(pm.posname) = LOWER(?)`;
            params.push(posName);
        }

        const data = await db.getResults(sql, params);
         
    if (roleId === 0 && data.length > 0) {          
        const menuMappings = await db.getResults(`SELECT pm.menuid,mm.menuname FROM posmappingmenu pm JOIN menumaster mm ON pm.menuid = mm.menuid AND mm.isdeleted=0 WHERE pm.posid = ? AND pm.isdeleted = 0`,[posId]);
          
        data[0].mappedMenus = menuMappings.map(item => ({
            menuid: item.menuid,
            menuname: item.menuname
        }));
    }
    
    return data;
},    

 createPos: async (data, posMappingMenu = [], roleId) => {
    try {
        await db.beginTransaction();

        const result = await db.getResults("SELECT poscode FROM posmaster ORDER BY CAST(poscode AS UNSIGNED) DESC LIMIT 1");
        let lastPoscode = result.length ? result[0].poscode : '000001';
        let newPoscode = String(parseInt(lastPoscode) + 1).padStart(6, '0');
        data.poscode = newPoscode;

        const insertResp = await db.insert('posmaster', data);

        if (roleId === 0 && posMappingMenu.length > 0) {
            for (let menuId of posMappingMenu) {
                const mappingRow = {
                    posid: insertResp.insertId,
                    menuid: menuId,
                    createdby: data.createdby,
                    createddate: moment().format('YYYY-MM-DD H:mm:ss'),
                    ipAddress: data.ipaddress,
                };

                await db.insert('posmappingmenu', mappingRow);
            }
        }

        await db.commit();

                return insertResp.insertId > 0
                  ? { status: 200, success: 1, msg: "POS created successfully." }
                  : { status: 500, success: 0, msg: "Failed to create POS." };

    } catch (error) {
        await db.rollback();
        return { status: 400, success: 0, msg: error.message };
    }
},

updatePos: async (posId, data) => {

        const sql = `UPDATE posmaster pm SET ? WHERE pm.isdeleted = 0 AND pm.posid = ?`;
        const resp = await db.getResults(sql, [data, posId]);
        return resp.affectedRows > 0
            ? { status: 200, success: 1, msg: " POS updated successfully." }
            : { status: 500, success: 0, msg: "Failed to update POS." };
    },

    deletePos: async (posId, data) => {
        const sql = `UPDATE posmaster SET ? WHERE posid IN (?)`;
        const resp = await db.getResults(sql, [data, posId]);
        return resp.affectedRows > 0
            ? { status: 200, success: 1, msg: " POS deleted successfully." }
            : { status: 500, success: 0, msg: "Failed to delete POS." };
    },


    getPaymentType: async (companyId) => {
        const sql = `SELECT pt.paymentid, pt.paymentmodename FROM paymenttype pt WHERE pt.isdeleted = 0 AND (pt.companyid = 0 OR pt.companyid = ?)`;

        const params = [companyId];

        const data = await db.getResults(sql, params);
        return data;
    },

    getOrderType: async (companyId) => {
        let sql = `SELECT om.ordertypeid, om.ordertype FROM ordertypemaster om WHERE om.isdeleted = 0 AND (om.companyid = 0 OR om.companyid = ?)`;

        const params = [companyId];

        const data = await db.getResults(sql, params);
        return data;
    }
}