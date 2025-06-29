const db = require('../config/db');
const moment = require("moment");
const date = moment();

module.exports = {

    getChargeList: async (req) => {

        const { draw, start, length, search, sortField, sortOrder } = req.query;
        const { locationId, companyId } = req.body;

        let sql = `SELECT cm.chargeid, cm.chargename,cm.chargetype,cm.chargevalue,cm.isactive,mm.menuname,c.companyid, c.companyname, IFNULL(cm.description,'') AS description,cb.username AS createdby, DATE_FORMAT(cm.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS modifiedby, IFNULL(DATE_FORMAT(cm.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate
        FROM chargemaster cm
        JOIN menumaster mm ON mm.menuid=cm.menuid AND mm.isdeleted=0
        JOIN companymaster c ON c.companyid=cm.companyid AND c.isdeleted=0
        JOIN usermaster cb ON cb.userid = cm.createdby
        LEFT JOIN usermaster mb ON mb.userid = cm.modifiedby
        WHERE cm.isdeleted=0 AND cm.locationid=? AND cm.companyid=?`;

        const params = [locationId,companyId];

        if (search && search.trim() !== '') {
            sql += ` AND LOWER(cm.chargename) LIKE LOWER(?)`;
            params.push(`%${search}%`);
        }
        const allData = await db.getResults(sql, params);

        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY cm.chargeid DESC`;
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


    getData: async (chargeId, locationId, menuId, findDuplicate) => {
    
        let sql = `SELECT cm.companyid,cm.chargeid, cm.locationid,lm.locationname,cm.menuid,cm.chargename,cm.chargevalue,cm.fulfillmentmodesjson,cm.productjson,cm.isactive,
                   IFNULL(cm.description,'') description, cm.applicableon FROM chargemaster cm 
                   JOIN locationmaster lm ON lm.locationid = cm.locationid AND lm.isdeleted = 0
                   and cm.isdeleted=0`;

        const params = [];

        if (chargeId && chargeId > 0) {
            if (findDuplicate) {
                sql += ` AND cm.chargeid != ?`;
                params.push(chargeId);
            } 
            else {
                sql += ` AND cm.chargeid = ?`;
                params.push(chargeId);
            }
        }
        if (locationId) {
            sql += ` AND cm.locationid = ?`;
            params.push(locationId);
        }
        if (menuId) {
            sql += ` AND cm.menuid = ?`;
            params.push(menuId);
        }
        
        const data = await db.getResults(sql, params);      
 
        return data.map(row => ({
            ...row,
            fulfillmentmodesjson: row.fulfillmentmodesjson ? row.fulfillmentmodesjson.split(',').map(Number) : [],
            productjson: row.productjson ? row.productjson.split(',').map(Number) : []
        }));
    },
    createCharge: async (data) => {

        const resp = await db.insert('chargemaster', data);
        return resp.affectedRows > 0
        ? { status: 200, success: 1, msg: "Charge created successfully." }
        : { status: 500, success: 0, msg: "Failed to insert charge." };
    },

    updateCharge: async (chargeId, data) => {

        const sql = `UPDATE chargemaster cm SET ? WHERE cm.isdeleted = 0 AND cm.chargeid = ?`;
        const resp = await db.getResults(sql, [data, chargeId]);
        return resp.affectedRows > 0
            ? { status: 200, success: 1, msg: "Charge updated successfully." }
            : { status: 500, success: 0, msg: "Failed to update charge." };
    },

    deleteCharge: async (chargeId, data) => {
        const sql = `UPDATE chargemaster SET ? WHERE chargeid IN (?)`;
        const resp = await db.getResults(sql, [data, chargeId]);
        return resp.affectedRows > 0
            ? { status: 200, success: 1, msg: "Charge deleted successfully." }
            : { status: 500, success: 0, msg: "Failed to delete Charge." };
    },


    getProductsWithCharge: async (locationId, menuId, chargeId, companyId) => {
        try {
            let associatedProductIds = [];
            let associatedProducts = [];
    
        
            const sql = `SELECT cm.chargeid, cm.productjson,cm.chargevalue
                         FROM chargemaster cm
                         WHERE cm.companyid = ?  AND cm.locationid = ? AND cm.isdeleted = 0`;
            const params = [companyId,locationId];
            const chargeMasterResults = await db.getResults(sql, params);

           associatedProductIds = Array.from(
                new Set(
                    chargeMasterResults.flatMap(row =>
                        row.productjson ? row.productjson.split(",").map(Number) : []
                    )
                )
            );

            if (chargeId) {
                
            
                const chargeData = chargeMasterResults.find(row => row.chargeid === chargeId);
                const productIdsForCharge = chargeData?.productjson
                    ? chargeData.productjson.split(",").map(Number)
                    : [];

    
                if (productIdsForCharge.length === 0) {
                    return { status: 404, success: 0, msg: "No products found for the given chargeId" };
                }
    
                const placeholders = productIdsForCharge.map(() => "?").join(",");

                const associatedProductsSql = `SELECT pm.productid, pm.productname
                                                FROM chargemaster cm
                                                JOIN productmaster pm 
                                                ON pm.productid IN (${placeholders}) AND pm.isdeleted = 0
                                                WHERE cm.locationid = ? AND cm.menuid = ? AND cm.chargeid = ? AND cm.companyid = ? AND cm.isdeleted = 0`;

                const associatedProductsParams = [...productIdsForCharge,locationId,menuId,chargeId,companyId];


                const chargeAssociatedResults = await db.getResults(associatedProductsSql,associatedProductsParams);

       
            associatedProducts = [
                    {
                        chargeid: chargeId,
                        chargevalue: chargeData.chargevalue,
                        products: chargeAssociatedResults,
                    },
                ];
            }
    
         let unAssociatedProductsSql = `SELECT pm.productid, pm.productname
                                        FROM productmaster pm
                                        WHERE pm.companyid = ? AND pm.isdeleted = 0`;
            const unAssociatedProductsParams = [companyId];
    
            if (associatedProductIds.length > 0) {
                const placeholders = associatedProductIds.map(() => "?").join(",");

                unAssociatedProductsSql += ` AND pm.productid NOT IN (${placeholders})`;
                unAssociatedProductsParams.push(...associatedProductIds);
            
            }
    
            const unAssociatedProductResults = await db.getResults(unAssociatedProductsSql, unAssociatedProductsParams);

            return { associatedProducts, unAssociatedProducts: unAssociatedProductResults };

        } catch (error) {
            return { status: 500, success: 0, msg: "Internal server error", error: error.message };
        }
    },
}