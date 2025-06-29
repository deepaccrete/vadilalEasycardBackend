const db = require('../../config/db');
const moment = require("moment");

module.exports = {
    getBrands: async (req) => {
        // const dateRange = req.query.dateRange.split('-');
        // const startDate = moment(Date.parse(dateRange[0])).format('YYYY-MM-DD');
        // const endDate = moment(Date.parse(dateRange[1])).format('YYYY-MM-DD');
        // req.company.companyId
        const { draw, start, length, search, sortField, sortOrder } = req.query;
        let sql = `SELECT cbm.companybrandmappingid as brandid,  cbm.brandname,  cb.username AS createdby, DATE_FORMAT(cbm.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS updatedby, IFNULL(DATE_FORMAT(cbm.updateddate, '%d-%m-%Y %r'), '') AS updateddate
        FROM companybrandmapping cbm
        JOIN usermaster cb ON cb.userid = cbm.createdby
        LEFT JOIN usermaster mb ON mb.userid = cbm.updatedby
        WHERE cbm.companyid = ? AND cbm.isdeleted = 0 `;

        const params = [req.body.companyId];
        
        if (search && search.trim() !== '') {
            sql += ` AND LOWER(cbm.brandname) LIKE LOWER(?)`;
            params.push(`%${search}%`);
        }
        const allData = await db.getResults(sql, params);

        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY cbm.companybrandmappingid DESC`;
        }


        if (length != -1) {
            sql += ` LIMIT ?, ?`;
            params.push(parseInt(start), parseInt(length));  // Ensure values are numbers
        }

        const filteredData = await db.getResults(sql, params);

        return {
            "draw": draw,
            "totalFiltered": filteredData.length,
            "totalRecords": allData.length,
            "data": filteredData,
        };

    },


    create: async (data) => {
        let resp = await db.insert('companybrandmapping', data);
        if (!resp.insertId) return { status: 500, success: 0, msg: 'Failed to Insert. Please try Again' };
        return { status: 201, success: 1, msg: 'Brand created successfully.' };
    },

    getData: async (id, companyId, name, findDuplicate) => {
        let sql = `SELECT companybrandmappingid as brandid, brandname FROM companybrandmapping cbm WHERE cbm.isdeleted = 0`;
        const params = [];

        if (id && id > 0) {
            if (findDuplicate) {
                sql += ` AND cbm.companybrandmappingid != ?`;
                params.push(id);
            } else {
                sql += ` AND cbm.companybrandmappingid = ?`;
                params.push(id);
            }
        }
        if (name) {
            sql += ` AND LOWER(cbm.brandname) = LOWER(?)`;
            params.push(name);
        }
        sql += ` AND cbm.companyid = ?`;
        params.push(companyId);

        return await db.getResults(sql, params);
    },


    update: async (companybrandmappingid, brandData) => {
        const resp = await db.getResults(`UPDATE companybrandmapping cbm SET ? WHERE cbm.companybrandmappingid=? AND cbm.isdeleted=0`, [brandData, companybrandmappingid]);

        if (!resp.affectedRows) return { status: 500, success: 0, msg: 'Failed to Update Brand' };
        return { status: 200, success: 1, msg: 'Brand Updated Successfully' };
    },

    delete: async (data, companybrandmappingid) => {
        try {
            const resp = await db.getResults(`UPDATE companybrandmapping cbm SET ? WHERE cbm.companybrandmappingid=?`, [data, companybrandmappingid])

            if (!resp.affectedRows) return { status: 500, success: 0, msg: 'Brand Not Found' };
            return { status: 200, success: 1, msg: 'Brand Deleted Successfully' };
        } catch (error) {
            winston.error(error);
            return { status: 500, success: 0, msg: error.message }
        }
    }
}