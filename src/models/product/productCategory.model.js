const db = require('../../config/db');
const moment = require("moment");

module.exports = {

    getProductCategoryList: async (req) => {
        const { companyId } = req.body;
        const { draw, start, length, search, brandId, sortField, sortOrder } = req.query;

        let sql = `SELECT pcm.productcategoryid, pcm.productcategoryname, IFNULL(pcm.displayorder, 0) AS displayorder, IFNULL(pcm.backcolor, '') AS backcolor, IFNULL(bm.brandname, '') AS brandname, cb.username AS createdby, DATE_FORMAT(pcm.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS modifiedby, IFNULL(DATE_FORMAT(pcm.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate
        FROM productcategorymaster pcm
        LEFT JOIN companybrandmapping bm ON pcm.brandid = bm.companybrandmappingid AND bm.isdeleted=0
        JOIN usermaster cb ON cb.userid = pcm.createdby
        LEFT JOIN usermaster mb ON mb.userid = pcm.modifiedby
        WHERE pcm.companyid = ? AND pcm.isdeleted = 0`;

        let params = [companyId];

        // Get total count before applying filters
        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(pcm.productcategoryname) LIKE LOWER(?) OR LOWER(bm.brandname) LIKE LOWER(?) OR LOWER(pcm.displayorder) LIKE LOWER(?) OR LOWER(pcm.backcolor) LIKE LOWER(?))`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        const allData = await db.getResults(sql, params);

        if (brandId && brandId !== '') {
            sql += ` AND pcm.brandid = ?`;
            params.push(brandId);
        }
        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY pcm.productcategoryid DESC`;
        }

        if (length != -1) {
            sql += ` LIMIT ?, ?`;
            params.push(parseInt(start), parseInt(length));
        }
        const filteredData = await db.getResults(sql, params);
        return {
            draw: draw,
            totalFiltered: filteredData.length,
            totalRecords: allData.length,
            data: filteredData,
        };
    },

    insert: async (data, ip) => {
        let prodCatObj = {
            brandid: data.brandId,
            productcategoryname: data.productCatName,
            displayorder: data.displayOrder,
            backcolor: data.backcolor,
            productcatappearance: data.productCatAppearance,
            descriptions: data.descriptions,
            onlinedisplyname: data.onlineDisplyName,
            weekdata: data.weekData,
            status: data.status,
            hidefrompos: data.hideFromPos,
            hidefromonlineordering: data.hideFromOnlineOrdering,
            productcategorytags: data.tag,
            linkoffer: data.linkOffer,
            companyid: data.companyId,
            productimgpath: data.categoryImg,
            createdby: data.createdby,
            ipaddress: ip,
            createddate: moment().format('YYYY-MM-DD H:m:s'),
            isdeleted: 0
        }
        let resp = await db.insert('productcategorymaster', prodCatObj);
        // let resp = {insertId: 1}
        if (!resp.insertId) return { status: 500, success: 0, msg: 'Failed to Insert. Please try Again' };
        return { status: 201, success: 1, msg: 'Product category created successfully.' };
    },

    getMultipleImagePath: async (productIds) => {
        let sql = `SELECT productimgpath FROM productmaster WHERE productid IN (?) AND isdeleted = 0`
        let resp = await db.getResults(sql, [productIds])
        return resp;
    },


    getData: async (prodCatId, companyId) => {
        return await db.getResults(`SELECT pcm.productcategoryid,pcm.brandid,pcm.productcategoryname,pcm.displayorder,pcm.displayorder,pcm.backcolor,pcm.productcatappearance,pcm.descriptions,pcm.weekdata,pcm.status,pcm.hidefrompos,pcm.hidefromonlineordering,pcm.onlinedisplyname,pcm.productimgpath FROM productcategorymaster pcm WHERE pcm.isdeleted=0 and pcm.productcategoryid=? and pcm.companyid= ?`, [prodCatId, companyId])
    },

    getMultipleImagePath: async (prodCatIds) => {
        let sql = `SELECT productimgpath FROM productcategorymaster WHERE productcategoryid IN (?) AND isdeleted = 0`
        let resp = await db.getResults(sql, [prodCatIds])
        return resp;
    },


    findDuplicate: async (productCatName, companyId, id) => {
        let sql = `SELECT pcm.productcategoryid FROM productcategorymaster pcm WHERE pcm.isdeleted = 0 AND LOWER(pcm.productcategoryname) = ? AND pcm.companyid = ?`;

        let params = [productCatName.toLowerCase(), companyId];

        if (id > 0) {
            sql += ` AND pcm.productcategoryid != ?`;
            params.push(id);
        }
        sql += ` LIMIT 1`;
        return await db.getResults(sql, params);
    },

    update: async (prodCatId, prodCatData) => {

        // Prepare the data array for the update query
        const dataToUpdate = Object.keys(prodCatData).map(key => ({
            column: key,
            value: "'" + prodCatData[key] + "'"
        }));

        const whereCondition = [{ column: 'productcategoryid', value: prodCatId }];

        const resp = await db.update('productcategorymaster', dataToUpdate, whereCondition);

        return resp.affectedRows > 0
            ? { status: 200, success: 1, msg: 'Data Updated Successfully' }
            : { status: 400, success: 0, msg: 'Failed to Update Data' };
    },

    delete: async (prodCatIds, userId, ip) => {
        try {
            const resp = await db.getResults(`UPDATE productcategorymaster pcm SET pcm.isdeleted=1, pcm.productimgpath=null, pcm.productimage=null, pcm.modifiedby=${userId}, pcm.modifieddate='${moment().format('YYYY-MM-DD H:m:s')}', pcm.ipaddress='${ip}' WHERE pcm.productcategoryid IN (?) and pcm.isdeleted=0`, [prodCatIds])

            return resp.affectedRows > 0
                ? { status: 200, success: 1, msg: 'Product category Deleted Successfully' }
                : { status: 500, success: 0, msg: 'Product category Not Found' };
        } catch (error) {
            return { status: 200, success: 0, msg: error.message }
        }
    }
}