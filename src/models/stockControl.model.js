const db = require('../config/db');

module.exports = {

  getData: async (req) => {
    const { draw, start, search,length, sortField, sortOrder } = req.query;
      const {productCategoryIds, productIds,companyId,locationId} = req.body;

    let sql = `
        SELECT omd.onlinemenuid, CONCAT(pm.productname, ' - ', pmm.portionname) AS productPortionName, pm.productid, pcm.productcategoryid, pcm.productcategoryname,
        pscm.subcategoryname, omd.stockinout
        FROM onlinemenudetails omd
        JOIN productmaster pm ON pm.productid = omd.productid AND pm.isdeleted = 0
        JOIN productcategorymaster pcm ON pcm.productcategoryid = pm.productcategoryid AND pcm.isdeleted = 0
        LEFT JOIN productsubcategorymaster pscm ON pscm.subcategoryid = pm.subcategory AND pscm.isdeleted = 0
        JOIN productportionmaster ppm ON ppm.productportionid = omd.productportionid AND ppm.isdeleted = 0
        JOIN portionmaster pmm ON pmm.portionid = ppm.portionid AND pmm.isdeleted = 0
        WHERE omd.isdeleted = 0 AND omd.companyid = ? AND omd.locationid = ?`;

     const params = [companyId,locationId];
      
    if (search && search.trim() !== '') {
        sql += ` AND (LOWER(pcm.productcategoryname) LIKE LOWER(?) OR LOWER(pm.productname) LIKE LOWER(?) OR LOWER(pmm.portionname) LIKE LOWER(?) OR LOWER(pscm.subcategoryname) LIKE LOWER(?))`;
        params.push(`%${search}%`,`%${search}%`,`%${search}%`,`%${search}%`);
    }

    if (productCategoryIds.length) {
        sql += ` AND pcm.productcategoryid IN (${productCategoryIds.map(() => '?').join(', ')})`;
        params.push(...productCategoryIds);
    }

    if (productIds.length) {
        sql += ` AND omd.productid IN (${productIds.map(() => '?').join(', ')})`;
        params.push(...productIds);
    }

    if (sortField && sortOrder) {
        sql += ` ORDER BY ${sortField} ${sortOrder}`;
    } else {
        sql += ` ORDER BY omd.onlinemenuid DESC`; 
    }

   if (length != -1) {
        sql += ` LIMIT ?, ?`;
        params.push(parseInt(start), parseInt(length));
    }

    const allData = await db.getResults(sql, params);

    const filteredData = await db.getResults(sql, params);

    return {
        draw: draw,
        totalFiltered: filteredData.length,
        totalRecords: allData.length,
        data: filteredData,
    };
},

updateStockControlItem: async (updateData, onlineStockData) => {
    const onlineMenuIds = onlineStockData.map(item => item.onlineMenuId);
    const caseStatements = onlineStockData .map(item => `WHEN ${item.onlineMenuId} THEN ${item.stockInOut}`).join(" ");
  
    const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(", ");
  
    const sql = `UPDATE onlinemenudetails SET ${updateFields},stockInOut = CASE onlineMenuId ${caseStatements} END WHERE isdeleted = 0 AND onlineMenuId IN (${onlineMenuIds.join(",")})`;
  
    const values = Object.values(updateData);
  
    const resp = await db.getResults(sql, values);
  
    return resp.affectedRows > 0
      ? { status: 200, success: 1, msg: "Stock Control Items updated successfully." }
      : { status: 404, success: 0, msg: "Failed to update stock control items" };
  },
  
 getModifiersData: async (req) => {
        const { draw, start, search,length, sortField, sortOrder } = req.query;
        const { modifierCategoryIds, modifierIds,companyId,locationId} = req.body;
     
        let sql = `SELECT oms.omid,mm.modifierid,mm.modifiername,mcm.modifiercategoryid,mcm.modifiercategoryname,oms.instock
             FROM onlinemodifierstockinout oms
             JOIN modifiermaster mm ON oms.modifierid = mm.modifierid AND mm.isdeleted = 0
             JOIN modifiercategorymaster mcm ON mm.modifiercategoryid = mcm.modifiercategoryid AND mcm.isdeleted = 0
             where oms.isdeleted = 0 AND oms.companyid = ? AND oms.locationid = ?`;

      
        const params = [companyId,locationId];

     if (search && search.trim() !== '') {
        sql += ` AND (LOWER(mm.modifiername) LIKE LOWER(?) OR LOWER(mcm.modifiercategoryname) LIKE LOWER(?))`;
        params.push(`%${search}%`,`%${search}%`);
      }
    
        if (modifierCategoryIds.length) {
            sql += ` AND mcm.modifiercategoryid IN (${modifierCategoryIds.map(() => '?').join(', ')})`;
            params.push(...modifierCategoryIds);
        }
    
        if (modifierIds.length) {
            sql += ` AND mm.modifierid IN (${modifierIds.map(() => '?').join(', ')})`;
            params.push(...modifierIds);
        }
    
        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY oms.omid DESC`; 
        }
    
       if (length != -1) {
          sql += ` LIMIT ?, ?`;
          params.push(parseInt(start), parseInt(length));
      }
      const allData = await db.getResults(sql, params);

      const filteredData = await db.getResults(sql, params);
  
      return {
          draw: draw,
          totalFiltered: filteredData.length,
          totalRecords: allData.length,
          data: filteredData,
      };
  },
 
  updateStockControlModifiers: async (updateData, onlineStockModifiersData) => {
   
  
    const omids = onlineStockModifiersData.map(item => item.omid);
    const caseStatements = onlineStockModifiersData.map(item => `WHEN ${item.omid} THEN ${item.inStock}`).join(" ");
    const updateFields = Object.keys(updateData).map(key => `${key} = ?`).join(", ");
  
    const sql = `UPDATE onlinemodifierstockinout SET ${updateFields},inStock = CASE omid ${caseStatements} END WHERE isdeleted = 0 AND omid IN (${omids.join(",")}) `;
   
    const values = Object.values(updateData);
  
    const resp = await db.getResults(sql, values);
  
    return resp.affectedRows > 0
      ? { status: 200, success: 1, msg: "Stock Control Modifiers updated successfully." }
      : { status: 404, success: 0, msg: "Failed to update stock control modifiers" };
  },
  
  
}


      
                
          

    