const db = require('../config/db');
const moment = require("moment");

module.exports = {
    getTableList: async (req) => {

        const { draw, start, length, search, sortField, sortOrder } = req.query;
        let sql = `SELECT tm.tableid, tm.tablename,tm.locationid, tm.companyid, tm.isactive, lm.locationname, cm.companyname,cb.username AS createdby,    DATE_FORMAT(tm.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS modifiedby, IFNULL(DATE_FORMAT(tm.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate
            FROM tablemaster tm
            JOIN locationmaster lm ON tm.locationid = lm.locationid AND lm.isdeleted = 0
            JOIN companymaster cm ON tm.companyid = cm.companyid AND cm.isdeleted = 0
            JOIN usermaster cb ON cb.userid = tm.createdby
            LEFT JOIN usermaster mb ON mb.userid = tm.modifiedby
            WHERE tm.companyid = ? AND tm.isdeleted = 0`;
    
        const params = [req.body.companyId];

        
        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(tm.tablename) LIKE LOWER(?) OR LOWER(lm.locationname) LIKE LOWER(?))`;
            params.push(`%${search}%`,`%${search}%`);
        }
        const allData = await db.getResults(sql, params);
        
        if (sortField && sortOrder) {
            sql += ` ORDER BY ${ sortField } ${ sortOrder } `;
        } else {
            sql += ` ORDER BY tm.tableid DESC`;
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

    getData: async (tableId, locationId, tableName, findDuplicate) => {
        let sql = `SELECT tableid, locationid, tablename, companyid, isactive FROM tablemaster tm WHERE tm.isdeleted = 0`;

        const params = [];

        if (tableId && tableId > 0) {
            if (findDuplicate) {
                sql += ` AND tm.tableid != ? `;
                params.push(tableId);
            } else {
                sql += ` AND tm.tableid = ? `;
                params.push(tableId);
            }
        }

        if (tableName) {
            sql += ` AND LOWER(tm.tablename) = LOWER(?)`;
            params.push(tableName);
        }
        if (locationId) {
            sql += ` AND tm.locationid = ? `;
            params.push(locationId);
        }

        const data = await db.getResults(sql, params);
        return data;
    },


    createTable: async (tableData) => {
        const tableObj = {
            companyid: tableData.companyId,
            locationid: tableData.locationId,
            tablename: tableData.tableName,
            isactive: tableData.isActive,
            createdby: tableData.createdby,
            createddate: tableData.createddate,
            ipaddress: tableData.ipaddress,
            createddate: moment().format('YYYY-MM-DD H:m:s'),
            isdeleted: 0
        };
        const resp = await db.insert('tablemaster', tableObj);
        return resp.affectedRows > 0
        ? { status: 200, success: 1, msg: "Table created successfully." }
        : { status: 500, success: 0, msg: "Failed to insert table." };
    },

    updateTable: async (tableId, data) => {
        const sql = `UPDATE tablemaster SET ? WHERE isdeleted = 0 AND tableid = ? `;
        const resp = await db.getResults(sql, [data, tableId]);

        return resp.affectedRows > 0
            ? { status: 200, success: 1, msg: "Table updated successfully." }
            : { status: 500, success: 0, msg: "Failed to update table." };
    },


    deleteTable: async (tableId, data) => {
        const sql = `UPDATE tablemaster SET ? WHERE tableid IN(?)`;
        const resp = await db.getResults(sql, [data, tableId]);
        return resp.affectedRows > 0
            ? { status: 200, success: 1, msg: "Table deleted successfully." }
            : { status: 500, success: 0, msg: "Failed to delete table." };
    },
}