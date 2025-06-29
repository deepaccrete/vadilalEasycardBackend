const db = require('../../config/db');
const moment = require("moment");
const date = moment();

module.exports = {

    getPortionList: async (req) => {
        const { draw, start, length, search, sortField, sortOrder } = req.query;

        let sql = `SELECT pm.portionid, pm.portionname, COUNT(DISTINCT ppm.productid) AS totalassociatedproducts, cb.username AS createdby, DATE_FORMAT(pm.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS modifiedby, IFNULL(DATE_FORMAT(pm.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate
        FROM portionmaster pm
        LEFT JOIN productportionmaster ppm ON ppm.portionid = pm.portionid AND ppm.isdeleted = 0
        JOIN usermaster cb ON cb.userid = pm.createdby
        LEFT JOIN usermaster mb ON mb.userid = pm.modifiedby
        WHERE pm.companyid = ? AND pm.isdeleted = 0
        GROUP BY pm.portionid`;
        const params = [req.body.companyId];
        
        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(pm.portionname) LIKE LOWER(?))`;
            params.push(`%${search}%`);
        }
        const allData = await db.getResults(sql, params);

        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY pm.portionid DESC`;
        }

        if (length != -1) {
            sql += ` LIMIT ?, ?`;
            params.push(parseInt(start), parseInt(length));
        }
        const filteredData = await db.getResults(sql, params);

        return {
            "draw": req.query.draw,
            "totalFiltered": filteredData.length,
            "totalRecords": allData.length,
            "data": filteredData,
        };
    },

    create: async (data) => {
        let brandObj = {
            portionname: data.portionName,
            companyid: data.companyId,
            createdby: data.createdBy,
            ipaddress: data.ip,
            createddate: moment().format('YYYY-MM-DD H:m:s'),
            isdeleted: 0
        }
        let resp = await db.insert('portionmaster', brandObj);
        if (!resp.insertId) return { status: 500, success: 0, msg: 'Failed to Insert. Please try Again' };
        return { status: 201, success: 1, msg: 'Portion created successfully.' };
    },

    getData: async (id, companyId, name, findDuplicate) => {
        let sql = `SELECT portionid, portionname FROM portionmaster pm WHERE pm.isdeleted = 0`;
        const params = [];

        if (id && id > 0) {
            if (findDuplicate) {
                sql += ` AND pm.portionid != ?`;
                params.push(id);
            } else {
                sql += ` AND pm.portionid = ?`;
                params.push(id);
            }
        }

        if (name) {
            sql += ` AND LOWER(pm.portionname) = LOWER(?)`;
            params.push(name);
        }

        sql += ` AND pm.companyid = ?`;
        params.push(companyId);

        return await db.getResults(sql, params);
    },

    update: async (portionId, portionData) => {

        // Prepare the data array for the update query
        const dataToUpdate = Object.keys(portionData).map(key => ({
            column: key,
            value: "'" + portionData[key] + "'"
        }));

        const whereCondition = [{ column: 'portionid', value: portionId }];

        const resp = await db.update('portionmaster', dataToUpdate, whereCondition);

        if (!resp.affectedRows) return { status: 500, success: 0, msg: 'Failed to Update Data' };
        return { status: 200, success: 1, msg: 'Data Updated Successfully' };
    },

    delete: async (data) => {
        try {
            const resp = await db.getResults(`UPDATE portionmaster pm SET pm.isdeleted=1 WHERE pm.portionid=? and pm.isdeleted=0`, [data.portionId])

            if (!resp.affectedRows) return { status: 500, success: 1, msg: 'Portion Not Found' };
            return { status: 200, success: 1, msg: 'Portion Deleted Successfully' };
        } catch (error) {
            return { success: 0, msg: error.message }
        }
    },

    getProductPortionList: async (productIds) => {
        try {
            const sql = `SELECT pm.productid, ppm.productportionid, CONCAT(pm.productname,' - ', p.portionname) productportionname
            FROM productportionmaster ppm
            JOIN productmaster pm ON pm.productid=ppm.productid AND pm.isdeleted=0
            JOIN portionmaster p ON p.portionid=ppm.portionid AND p.isdeleted=0
            WHERE ppm.isdeleted=0 AND pm.productid IN(?);`;
            const params = [productIds];
            return await db.getResults(sql, params);
        } catch (error) {
            return { success: 0, msg: error.message }
        }
    }
}