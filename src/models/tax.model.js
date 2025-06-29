const db = require('../config/db');
const moment = require("moment");
const date = moment();

module.exports = {
    getTaxProfile: async (req) => {
        const { companyId } = req.body;
        const { draw, start, length, search, sortField, sortOrder } = req.query;

        let sql = `SELECT tpm.taxprofileid, tpm.taxprofilename, tpm.taxpercentage, tpm.isdefault, tpm.companyid, tpm.isorderlevel, cb.username AS createdby, DATE_FORMAT(tpm.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS modifiedby, IFNULL(DATE_FORMAT(tpm.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate 
        FROM taxprofilemaster tpm 
        JOIN usermaster cb ON cb.userid = tpm.createdby
        LEFT JOIN usermaster mb ON mb.userid = tpm.modifiedby
        WHERE tpm.isdeleted = 0`;

        let params = [];

        if (companyId !== 0) {
            sql += ` AND (tpm.companyid = ? OR tpm.companyid=0)`;
            params.push(companyId);
        }

        
        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(tpm.taxprofilename) LIKE LOWER(?) OR LOWER(tpm.taxpercentage) LIKE LOWER(?) OR LOWER(tpm.isdefault) LIKE LOWER(?) OR tpm.isorderlevel LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        const allData = await db.getResults(sql, params);

        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY tpm.taxprofileid DESC`;
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

    getTax: async (taxProfileId) => {
        return await db.getResults(`SELECT tpm.taxpercentage FROM taxprofilemaster tpm WHERE tpm.isdeleted=0 AND tpm.taxprofileid=?;`, [taxProfileId]
        );
    },

    isIncExcTax: async (menuId) => {
        return await db.getResults(`SELECT mm.inclusiveexclusivegst FROM menumaster mm  WHERE mm.isactive=1 AND mm.isdeleted=0 AND mm.menuid = ?;`, [menuId]
        );
    },

}