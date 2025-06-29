
const db = require('../config/db');

module.exports = {
    
    getProductTagList: async (req) => {

        const { draw, start, length, search, sortField, sortOrder } = req.query;
        let sql = `SELECT tm.tagname , IFNULL(tm.tagimage,'') as tagImage , tm.tid  from tagmaster tm where tm.isdeleted=0`;
    
        const params = [];

        
        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(tm.tagname) LIKE LOWER(?))`;
            params.push(`%${search}%`);
        }
        const allData = await db.getResults(sql, params);
        
        if (sortField && sortOrder) {
            sql += ` ORDER BY ${ sortField } ${ sortOrder } `;
        } else {
            sql += ` ORDER BY tm.tid DESC`;
        }``
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

    getProductTagData: async (tagId,tagName ,findDuplicate) => {
        let sql = `SELECT tm.tid ,  tm.tagname , IFNULL(tm.tagimage, '') AS tagImage  from tagmaster tm where tm.isdeleted=0`;

        const params = [];

        if (tagName && tagName.trim() !== '') { 
            sql += ` AND (LOWER(tm.tagname) = LOWER(?))`;
            params.push(tagName);
        }

        if (tagId && tagId > 0) {
            if (findDuplicate) {
                sql += ` AND tm.tid != ? `;
                params.push(tagId);
            } else {
                sql += ` AND tm.tid = ? `;
                params.push(tagId);
            }
        }
      
        const data = await db.getResults(sql, params);
        return data;
    },


    createProductTag: async (data) => {
       
        const resp = await db.insert('tagmaster', data);
        return resp.affectedRows > 0
        ? { status: 200, success: 1, msg: "Product Tag created successfully." }
        : { status: 500, success: 0, msg: "Failed to insert Product Tag." };
    },

    updateProductTag: async (productTagId, data) => {
        const sql = `UPDATE tagmaster SET ? WHERE isdeleted = 0 AND tid = ? `;
        const resp = await db.getResults(sql, [data, productTagId]);

        return resp.affectedRows > 0
            ? { status: 200, success: 1, msg: "Product Tag updated successfully." }
            : { status: 500, success: 0, msg: "Failed to update Product Tag." };
    },

    getMultipleImagePath: async (productTagIds) => { 
  let sql = `SELECT tagimage FROM tagmaster WHERE tid IN (?) AND isdeleted = 0`
        let resp = await db.getResults(sql, [productTagIds])
        return resp


    },

    deleteProductTag: async (productTagId, data) => {
        const sql = `UPDATE tagmaster SET ? WHERE tid IN (?)`;
        const resp = await db.getResults(sql, [data, productTagId]);
        return resp.affectedRows > 0
            ? { status: 200, success: 1, msg: "Product Tag deleted successfully." }
            : { status: 500, success: 0, msg: "Failed to delete Product Tag." };
    },
}