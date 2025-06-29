const db = require('../../config/db');
const moment = require("moment");
const date = moment();


module.exports = {

    getData: async (id, companyId, name, findDuplicate, modifiercategoryid) => {

        let sql = `SELECT  mm.modifierid, mm.modifiername, IFNULL(mm.modifierimage, "") modifierimage, mm.modifiercategoryid, mm.companyid, mm.price, IFNULL(mm.onlineprice, "") onlineprice, mm.foodtype, mm.parentmodifierid, mm.maxqtyallowed, mm.aftermaxqtyprice, mm.isonline, mm.modifiertags
        FROM modifiermaster mm 
        WHERE mm.isdeleted = 0`;

        const params = [];

        if (id && id > 0) {

            if (findDuplicate) {
                sql += ` AND mm.modifierid != ?`;
                params.push(id);
            } else {
                sql += ` AND mm.modifierid = ?`;
                params.push(id);
            }
        }

        if (name) {
            sql += ` AND LOWER(mm.modifiername) = LOWER(?)`;
            params.push(name);
        }

        if (companyId) {
            sql += ` AND mm.companyid = ?`;
            params.push(companyId);
        }


        if (modifiercategoryid) {
            sql += ` AND mm.modifiercategoryid = ?`;
            params.push(modifiercategoryid);
        }


        return await db.getResults(sql, params);

    },
    create: async (data) => {
        let resp = await db.insert('modifiermaster', data);
        if (!resp.insertId) return { status: 500, success: 0, msg: 'Failed to Insert. Please try Again' }
        return { success: 1, status: 200, msg: 'Modifier Created Successfully.' };

    },
    update: async (modifierId, updateData) => {
        let resp = await db.getResults(`UPDATE modifiermaster SET ? WHERE isdeleted = 0 AND modifierid = ?`, [updateData, modifierId]);
        if (!resp.affectedRows) return { status: 500, success: 0, msg: 'Failed to Update. Please try Again.' };
        return { success: 1, status: 201, msg: 'Modifier Updated Successfully.' };

    },
    getModifierList: async (req) => {

        const { draw, start, length, search, sortField, sortOrder } = req.query;

        let sql = `SELECT  mm.modifierid, mm.modifiername, mm.modifierimage, mm.modifiercategoryid, mm.companyid, mm.price, mm.onlineprice, mm.foodtype, mm.parentmodifierid, mm.maxqtyallowed, mm.aftermaxqtyprice, mm.isonline, cb.username AS createdby, DATE_FORMAT(mm.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS modifiedby, IFNULL(DATE_FORMAT(mm.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate 
        FROM modifiermaster mm 
        JOIN usermaster cb ON cb.userid = mm.createdby
    LEFT JOIN usermaster mb ON mb.userid = mm.modifiedby
    WHERE  mm.isdeleted = 0 AND mm.companyid=?`;

        const params = [req.body.companyId];
        
        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(mm.modifiername) LIKE LOWER(?) OR LOWER(mm.price) LIKE LOWER(?))`;

            params.push(`%${search}%`, `%${search}%`);
        }
        const allData = await db.getResults(sql, params);

        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY mm.modifierid DESC`;
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

    getMultipleImagePath: async (modifierIds) => {
        let sql = `SELECT modifierimage FROM modifiermaster WHERE modifierid IN (?) AND isdeleted = 0`
        let resp = await db.getResults(sql, [modifierIds])
        return resp

    },
    deleteModifier: async (modifierIds, modifierData) => {

        let sql = `UPDATE modifiermaster SET ? WHERE modifierid IN (?)`;
        let resp = await db.getResults(sql, [modifierData, modifierIds]);
        if (!resp.affectedRows) return { success: 0, status: 500, msg: 'Failed to Delete. Please try Again.' }
        return { success: 1, status: 200, msg: 'Data Deleted Successfully.' }
    },
    getModifierOfCategory: async (companyId, modifierCategoryId) => {
        const data = await db.getResults(`select mm.modifierid, mm.modifiername from modifiermaster mm where isdeleted = 0 AND companyid = ? and mm.modifiercategoryid in (?)`, [companyId, modifierCategoryId])
        return data;
    }

}   