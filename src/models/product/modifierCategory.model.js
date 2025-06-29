const db = require("../../config/db");

const moment = require("moment");

module.exports = {

  createModifiercategory: async (data) => {
    let modifiercategoryObj = {
      modifiercategoryname: data.modifierCategoryName,
      companyid: data.companyId,
      displayorder: data.displayOrder,
      selectionmandatory: data.selectionMandatory,
      minimumselection: data.minimumSelection,
      maximumselection: data.maximumSelection,
      isfreetagging: data.isFreeTagging,
      createdby: data.createdBy,
      ipaddress: data.ip,
      createddate: moment().format("YYYY-MM-DD H:m:s"),
      isdeleted: 0,
    };
    let resp = await db.insert("modifiercategorymaster", modifiercategoryObj);

    return resp.insertId > 0
      ? { status: 201, success: 1, msg: "Modifier category created successfully." }
      : { status: 500, success: 0, msg: "Failed to Insert. Please try Again" };
  },
  getData: async (id, companyId, name, findDuplicate) => {
    let sql = `SELECT  modifiercategoryname , maximumselection,minimumselection, isfreetagging, selectionmandatory,displayorder FROM modifiercategorymaster mcm WHERE mcm.isdeleted = 0 `;
    const params = [];
    if (id && id > 0) {
      if (findDuplicate) {
        sql += ` AND mcm.modifiercategoryid != ?`;
        params.push(id);
      } else {
        sql += ` AND mcm.modifiercategoryid = ?`;
        params.push(id);
      }
    }
    if (name) {
      sql += ` AND LOWER(mcm.modifiercategoryname) = LOWER(?)`;
      params.push(name);
    }
    if (companyId && companyId > 0) {
      sql += ` AND mcm.companyid = ?`;
      params.push(companyId);
    }
    const data = await db.getResults(sql, params);
    return data;

  },

  getModifierCategoryList: async (req) => {
    const { draw, start, length, search, sortField, sortOrder } = req.query;

    let sql = `SELECT mcm.modifiercategoryid, mcm.modifiercategoryname , mcm.maximumselection,mcm.minimumselection, mcm.isfreetagging, mcm.selectionmandatory,mcm.displayorder, cb.username AS createdby, DATE_FORMAT(mcm.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS modifiedby, IFNULL(DATE_FORMAT(mcm.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate 
    FROM modifiercategorymaster mcm
    JOIN usermaster cb ON cb.userid = mcm.createdby
    LEFT JOIN usermaster mb ON mb.userid = mcm.modifiedby
    WHERE  mcm.isdeleted = 0 AND mcm.companyid=?`;

    const params = [req.body.companyId];

    if (search && search.trim() !== '') {
      sql += ` AND (LOWER(mcm.modifiercategoryname) LIKE ? 
      OR LOWER(mcm.maximumselection) LIKE ? 
      OR LOWER(mcm.minimumselection) LIKE ? 
      OR LOWER(mcm.displayorder) LIKE ?)`;

      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    const allData = await db.getResults(sql, params);

    if (sortField && sortOrder) {
      sql += ` ORDER BY ${sortField} ${sortOrder}`;
    } else {
      sql += ` ORDER BY mcm.modifiercategoryid DESC`;
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


    // let sql = `SELECT modifiercategoryname , maximumselection,minimumselection, isfreetagging, selectionmandatory,displayorder FROM modifiercategorymaster WHERE  isdeleted = 0 `;
    // const params = [];
    // const allData = await db.getResults(sql, params);
    // if (req.body.companyId) {
    //   sql += ` AND companyid = ?`;
    //   params.push(req.body.companyId);
    // }
    // if (req.query.search && req.query.search.trim() !== "") {
    //   sql += ` AND modifiercategoryname LIKE ?`;
    //   params.push(`%${req.query.search}%`);
    // }
    // if (req.body.modifierCategoryName) {
    //   sql += ` AND modifiercategoryname = ?`;
    //   params.push(req.body.modifierCategoryName);
    // }
    // const { start, length } = req.query;
    // if (req.query.length != -1) {
    //   sql += ` LIMIT ?, ?`;
    //   params.push(parseInt(start), parseInt(length));
    // }
    // const filteredData = await db.getResults(sql, params);
    // console.log(filteredData?.length);
    // return {
    //   "totalFiltered": filteredData.length,
    //   "totalRecords": allData[0].total,
    //   "data": filteredData,
    // };
  },
  updateModifierCategory: async (data, modifierCategoryId) => {
    const sql = `UPDATE modifiercategorymaster SET ? WHERE modifiercategoryid = ? AND isdeleted = 0`;
    const resp = await db.getResults(sql, [data, modifierCategoryId]);
    return resp.affectedRows > 0
      ? { success: 1, msg: "Modifier category updated successfully.", status: 200 }
      : { success: 0, msg: "Failed to update modifier category.", status: 500 };
  },
  deleteModifierCategory: async (data) => {
    const sql = `UPDATE modifiercategorymaster SET isdeleted = 1 ,  modifieddate = ? , modifiedby = ?  WHERE modifiercategoryid IN (?)`;
    const params = [

      modifieddate = data.modifiedDate,
      mmodifiedby = data.modifiedBy,
      modifiercategoryid = data.modifierCategoryId

    ]
    const resp = await db.getResults(sql, params);
    return resp.affectedRows > 0
      ? { success: 1, msg: "Modifier categories deleted successfully.", status: 200 }
      : { success: 0, msg: "Failed to delete modifier categories.", status: 500 };
  },
};
