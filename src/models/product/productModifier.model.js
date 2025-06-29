const db = require("../../config/db");
const moment = require("moment");
const winston = require("../../config/winston.js");

const calcTaxprice = (isIncExc, tax, price) => {
  price = parseFloat(price) || 0;
  tax = parseFloat(tax) || 0;

  if (isIncExc) {
    return parseFloat((price / (1 + tax / 100)).toFixed(4));
  } else {
    return parseFloat((price + price * (tax / 100)).toFixed(4));
  }
};

module.exports = {
  addProductModifier: async (value, ip, userId) => {
    try {
      await db.beginTransaction();

      // Fetch all modifier details in a single query
      const modifierResults = await db.getResults(
        `SELECT modifierid, modifiercategoryid, price, onlineprice, parentmodifierid FROM modifiermaster WHERE modifierid IN (?) AND isdeleted = 0`,
        [value.modifierIds]
      );

      if (!modifierResults.length) {
        return { status: 400, success: 0, msg: "Invalid Modifier IDs" };
      }

      // Convert modifierResults to a map for fast access
      const modifierMap = {};
      modifierResults.forEach((mod) => {
        modifierMap[mod.modifierid] = mod;
      });

      // Fetch tax profile for all unique productIds
      const productIds = [
        ...new Set(value.productPortionIds.map((p) => p.productId)),
      ];
      const taxProfileResults = await db.getResults(
        `SELECT pm.productid, pm.taxprofileid, tpm.taxpercentage FROM productmaster pm JOIN taxprofilemaster tpm ON pm.taxprofileid = tpm.taxprofileid WHERE pm.productid IN (?) AND pm.isdeleted = 0 AND tpm.isdeleted = 0`,
        [productIds]
      );

      const taxProfileMap = {};
      taxProfileResults.forEach((tax) => {
        taxProfileMap[tax.productid] = tax;
      });

      let menuMap = {};
      let hasMenuIds = value.menuIds?.length > 0;
      if (hasMenuIds) {
        // Fetch location details for all menuIds
        const menuResults = await db.getResults(
          `SELECT menuid, locationid FROM menumaster WHERE menuid IN (?) AND isdeleted = 0`,
          [value.menuIds]
        );

        menuResults.forEach((menu) => {
          menuMap[menu.menuid] = menu.locationid;
        });
      }

      // Process and insert data
      for (let { productId, productPortionId } of value.productPortionIds) {
        for (let modifierId of value.modifierIds) {
          const modifierDetails = modifierMap[modifierId];
          if (!modifierDetails) continue;

          let isDefault = value.defaultModifierIds?.includes(modifierId)
            ? 1
            : 0;

          // Prepare product modifier object
          const productModifierObj = {
            productid: productId,
            productportionid: productPortionId,
            parentmodifierid: modifierDetails.parentmodifierid || 0,
            modifierid: modifierId,
            isdefault: isDefault,
            createdby: userId,
            ipaddress: ip,
            createddate: moment().format("YYYY-MM-DD H:m:s"),
            isdeleted: 0,
            companyid: value.companyId,
          };

          const productInsertResp = await db.insert(
            "productmodifiers",
            productModifierObj
          );
          if (!productInsertResp.insertId) {
            await db.rollback();
            return {
              status: 500,
              success: 0,
              msg: "Failed to Insert Product Modifiers.",
            };
          }

          if (hasMenuIds) {
            const taxProfile = taxProfileMap[productId] || {};
            const taxPercentage = taxProfile.taxpercentage || 0;
            const price = modifierDetails.price || 0;
            const onlinePrice = modifierDetails.onlineprice || 0;

            const taxPrice = calcTaxprice(0, taxPercentage, price);
            const taxAmount = taxPrice - price;
            const onlineTaxPrice = calcTaxprice(0, taxPercentage, onlinePrice);
            const onlineTaxAmount = onlineTaxPrice - onlinePrice;

            for (let menuId of value.menuIds) {
              const menuProductModifierObj = {
                menuid: menuId,
                productportionid: productPortionId,
                modifiercategoryid: modifierDetails.modifiercategoryid || 0,
                modifierid: modifierId,
                price: price,
                taxamount: taxAmount || 0,
                taxprice: taxPrice || 0,
                onlineprice: onlinePrice || 0,
                onlinetaxamount: onlineTaxAmount || 0,
                onlinetaxprice: onlineTaxPrice || 0,
                parentmodifierid: modifierDetails.parentmodifierid || 0,
                taxprofileid: taxProfile.taxprofileid || 0,
                isdefaultmodifier: isDefault,
                companyid: value.companyId,
                createdby: userId,
                createddate: moment().format("YYYY-MM-DD H:m:s"),
                ipaddress: ip,
                isdeleted: 0,
                locationid: menuMap[menuId], // locationid from pre-fetched data
              };

              const menuInsertResp = await db.insert(
                "menuproductmodifiers",
                menuProductModifierObj
              );
              if (!menuInsertResp.insertId) {
                await db.rollback();
                return {
                  status: 500,
                  success: 0,
                  msg: "Failed to Insert Menu Product Modifiers.",
                };
              }
            }
          }
        }
      }

      await db.commit();
      return {
        success: 1,
        status: 201,
        msg: "Modifiers inserted successfully.",
      };
    } catch (error) {
      await db.rollback();
      winston.error(error);
      return { status: 500, success: 0, msg: "Internal Server Error" };
    }
  },

  getProductModifierList: async (req) => {
    const { draw, start, length, search, sortField, sortOrder } = req.query;

    let sql = `SELECT pmm.productmodifierid, pcm.productcategoryname, pm.productname, p.portionname, mm.modifiername, mcm.modifiercategoryname, pmm.isdefault, cb.username AS createdby, DATE_FORMAT(pmm.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS modifiedby, IFNULL(DATE_FORMAT(pmm.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate FROM productmodifiers pmm JOIN productportionmaster ppm ON ppm.productportionid = pmm.productportionid AND ppm.isdeleted = 0 JOIN productmaster pm ON pm.productid = pmm.productid AND pm.isdeleted = 0 JOIN productcategorymaster pcm ON pcm.productcategoryid = pm.productcategoryid AND pcm.isdeleted = 0 JOIN modifiermaster mm ON mm.modifierid = pmm.modifierid AND mm.isdeleted = 0 JOIN modifiercategorymaster mcm ON mcm.modifiercategoryid = mm.modifiercategoryid AND mcm.isdeleted = 0 JOIN portionmaster p ON p.portionid = ppm.portionid AND p.isdeleted = 0 JOIN usermaster cb ON cb.userid = pmm.createdby LEFT JOIN usermaster mb ON mb.userid = pmm.modifiedby WHERE pmm.companyid = ? AND pmm.isdeleted=0`;

    const params = [req.body.companyId];

    if (search && search.trim() !== "") {
      sql += ` AND (LOWER(pm.productname) LIKE LOWER(?) OR LOWER(mm.modifiername) LIKE LOWER(?) OR LOWER(pcm.productcategoryname) LIKE LOWER(?) OR LOWER(mcm.modifiercategoryname) LIKE LOWER(?))`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    // Fetch all data before filtering
    const allData = await db.getResults(sql, params);

    // Sorting logic
    if (sortField && sortOrder) {
      sql += ` ORDER BY ${sortField} ${sortOrder}`;
    } else {
      sql += ` ORDER BY pmm.productmodifierid DESC`;
    }

    // Apply pagination
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

  deleteProductModifier: async (productmodifierid, updateData) => {
    let sql = `UPDATE productmodifiers SET ? WHERE  productmodifierid in (?) and isdeleted=0`;
    let resp = await db.getResults(sql, [updateData, productmodifierid]);
    if (!resp.affectedRows)
      return {
        status: 500,
        success: 0,
        msg: "Failed to delete. Please try Again.",
      };
    return {
      success: 1,
      status: 200,
      msg: "Product Modifier Unlinked Successfully.",
    };
  },

  getModifierWithCategoryDropdown: async (companyId) => {
    return await db.getResults(
      `SELECT mcm.modifiercategoryid, mcm.modifiercategoryname, JSON_ARRAYAGG(JSON_OBJECT('modifierid', mm.modifierid, 'modifiername', mm.modifiername)) modifiers
    FROM modifiermaster mm
    JOIN modifiercategorymaster mcm ON mcm.modifiercategoryid=mm.modifiercategoryid AND mcm.isdeleted=0
    WHERE mm.isdeleted=0 AND mm.companyid=? GROUP BY mcm.modifiercategoryid, mcm.modifiercategoryname;`,
      [companyId]
    );
  },
};
