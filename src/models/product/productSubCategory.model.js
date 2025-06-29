const db = require('../../config/db');
const moment = require("moment");
const date = moment();

module.exports = {

    getProductSubcategoryList: async (req) => {
        const { companyId, categoryId } = req.body;
        const { draw, start, length, search, brandId, sortField, sortOrder } = req.query;

        let sql = `SELECT pscm.subcategoryid, pscm.subcategoryname, IFNULL(pscm.displayorder, 0) AS displayorder, pcm.productcategoryid, pcm.productcategoryname, cb.username AS createdby, DATE_FORMAT(pscm.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS modifiedby, IFNULL(DATE_FORMAT(pscm.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate 
            FROM productsubcategorymaster pscm
            JOIN productcategorymaster pcm ON pscm.productcategoryid = pcm.productcategoryid AND pcm.isdeleted=0
            JOIN usermaster cb ON cb.userid = pscm.createdby
            LEFT JOIN usermaster mb ON mb.userid = pscm.modifiedby
            WHERE pscm.companyid = ? AND pscm.isdeleted = 0`;

        let params = [companyId];
        
        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(pcm.productcategoryname) LIKE LOWER(?) OR LOWER(pscm.subcategoryname) LIKE LOWER(?) OR LOWER(pscm.displayorder) LIKE LOWER(?))`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        if (categoryId.length > 0) {
            sql += ` AND pcm.productcategoryid IN(?)`;
            params.push(categoryId);
        }
        
        if (brandId && brandId > 0) {
            sql += ` AND pcm.brandid = ?`;
            params.push(brandId);
        }
        const allData = await db.getResults(sql, params);

        if (sortField && sortOrder) sql += ` ORDER BY ${sortField} ${sortOrder}`;
        else sql += ` ORDER BY pscm.subcategoryid DESC`;

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

    insert: async (data, ip) => {
        let prodSubCatObj = {
            productcategoryid: data.productCatId,
            subcategoryname: data.productSubCatName,
            displayorder: data.displayOrder,
            companyid: data.companyId,
            createdby: data.createdby,
            ipaddress: ip,
            createddate: date.format('YYYY-MM-DD H:m:s'),
            isdeleted: 0
        }
        let resp = await db.insert('productsubcategorymaster', prodSubCatObj);
        // let resp = {insertId: 1}
        if (!resp.insertId) return { status: 500, success: 0, msg: 'Failed to Insert. Please try Again' };
        return { status: 201, success: 1, msg: 'Product sub category created successfully.' };
    },

    getData: async (prodSubCatId, companyId, prodSubCatName) => {
        let sql = `SELECT pscm.subcategoryid, pscm.productcategoryid, pscm.subcategoryname, pscm.displayorder FROM productsubcategorymaster pscm WHERE pscm.isdeleted = 0`;

        let params = [];

        if (prodSubCatId !== 0) {
            sql += ` AND pscm.subcategoryid = ?`;
            params.push(prodSubCatId);
        }

        if (prodSubCatName) {
            sql += ` AND LOWER(pscm.subcategoryname) = ?`;
            params.push(prodSubCatName.toLowerCase());
        }

        sql += ` AND pscm.companyid = ?;`;
        params.push(companyId);

        return await db.getResults(sql, params);
    },

    findDuplicate: async (data, id) => {
        let sql = `SELECT pscm.subcategoryid FROM productsubcategorymaster pscm WHERE pscm.isdeleted = 0 AND LOWER(pscm.subcategoryname) = ? AND pscm.companyid = ? AND pscm.productcategoryid = ?`;

        let params = [data.productSubCatName.toLowerCase(), data.companyId, data.productCatId];

        if (id > 0) {
            sql += ` AND pscm.subcategoryid != ?`;
            params.push(id);
        }
        sql += ` LIMIT 1`;
        return await db.getResults(sql, params);
    },


    update: async (prodsubCatId, prodSubCatData) => {

        // Prepare the data array for the update query
        const dataToUpdate = Object.keys(prodSubCatData).map(key => ({
            column: key,
            value: "'" + prodSubCatData[key] + "'"
        }));

        const whereCondition = [{ column: 'subcategoryid', value: prodsubCatId }];
        const resp = await db.update('productsubcategorymaster', dataToUpdate, whereCondition);

        if (!resp.affectedRows) return { status: 500, success: 0, msg: 'Failed to Update Data' };
        return { status: 200, success: 1, msg: 'Data Updated Successfully' };
    },

    delete: async (prodSubCatId) => {
        try {
            const resp = await db.getResults(`UPDATE productsubcategorymaster pscm SET pscm.isdeleted=1 WHERE pscm.subcategoryid=? and pscm.isdeleted=0`, [prodSubCatId])

            if (!resp.affectedRows) return { status: 500, success: 1, msg: 'Product sub category Not Found' };
            return { status: 200, success: 1, msg: 'Product sub category Deleted Successfully' };
        } catch (error) {
            winston.error(error);
            return { success: 0, msg: error.message }
        }
    }
}