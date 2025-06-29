const db = require('../config/db');
const moment = require('moment');

module.exports = {

    getDeliveryChargeList: async (req) => {

        const { draw, start, length, search, sortField, sortOrder } = req.query;
        let sql = `SELECT dc.deliverychargeid, cm.companyname, lm.locationname, dc.deliveryradius,cb.username AS createdby, DATE_FORMAT(dc.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS modifiedby, IFNULL(DATE_FORMAT(dc.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate
        FROM deliverychargemaster dc
        JOIN companymaster cm ON cm.companyid=dc.companyid AND cm.isdeleted=0
        JOIN locationmaster lm ON lm.locationid=dc.locationid AND lm.isdeleted=0
        JOIN usermaster cb ON cb.userid = dc.createdby
        LEFT JOIN usermaster mb ON mb.userid = dc.modifiedby
        WHERE dc.isdeleted=0 `;
        const params = [];

        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(cm.companyname) LIKE LOWER(?) OR LOWER(lm.locationname) LIKE LOWER(?) OR LOWER(dc.deliveryradius) LIKE LOWER(?))`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        const allData = await db.getResults(sql, params);

        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY dc.deliverychargeid DESC`;
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

    getData: async (deliveryId, locationIds, findDuplicate) => {
        let sql = `SELECT dc.deliverychargeid, dc.companyid,dc.locationid,dc.taxprofileid, dc.deliveryradius,dc.chargejson FROM deliverychargemaster dc
        WHERE dc.isdeleted=0`;
        const params = [];

        if (deliveryId && deliveryId > 0) {
            if (findDuplicate) {
                sql += ` AND dc.deliverychargeid != ?`;
                params.push(deliveryId);
            } else {
                sql += ` AND dc.deliverychargeid = ?`;
                params.push(deliveryId);
            }
        }
        if (locationIds) {
            sql += ` AND dc.locationid IN (${locationIds.map(() => '?').join(',')})`;
            params.push(...locationIds); 
        }

        const data = await db.getResults(sql, params);
        return data;
    },
    
    createDeliveryCharge: async (data) => {
        try {
      
          const deliverychargeid = data.insertId;
      
          for (let locationId of data.locationIds) {
            const insertData = {
              companyid: data.companyId,
              taxprofileid: data.taxProfileId,
              deliveryradius: data.deliveryRadius,
              chargeJson:data.chargeJson,
              deliverychargeid,
              locationid: locationId,
              createdby: data.createdby,
              createddate: moment().format('YYYY-MM-DD H:m:s'),
              ipaddress: data.ipaddress
    
            };
      
            await db.insert('deliverychargemaster', insertData);
          }
      
          return { status: 200, success: 1, msg: "Delivery Charge created successfully." };
        } catch (error) {
          return { status: 500, success: 0, msg: "Failed to create Delivery Charge." };
        }
      },
    
    updateDeliveryCharge: async (deliveryId, data) => {

        const sql = `UPDATE deliverychargemaster dc SET ? WHERE dc.isdeleted = 0 AND dc.deliverychargeid = ?`;
        const resp = await db.getResults(sql, [data, deliveryId]);
        return resp.affectedRows > 0
            ? { status: 200, success: 1, msg: " Delivery Charge updated successfully." }
            : { status: 500, success: 0, msg: "Failed to update Delivery Charge." };
    },

    deleteDeliveryCharge: async (deliveryId, data) => {
        const sql = `UPDATE deliverychargemaster SET ? WHERE deliverychargeid IN (?)`;
        const resp = await db.getResults(sql, [data, deliveryId]);
        return resp.affectedRows > 0
            ? { status: 200, success: 1, msg: " Delivery Charge deleted successfully." }
            : { status: 500, success: 0, msg: "Failed to delete Delivery Charge." };
    },
}