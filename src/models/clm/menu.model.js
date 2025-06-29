const moment = require('moment');
const db = require('../../config/db');
const winston = require('../../config/winston.js');
const { createError } = require('../../utils/errorHandler.utils');

module.exports = {
    getMenuList: async (req) => {
        const { companyId } = req.body;
        const { draw, start, length } = req.query;

        let sql = `SELECT mm.menuid, mm.menuname, mm.companyid, cm.companyname, mm.createddate, mm.createdby, mm.modifieddate, mm.modifiedby
        FROM menumaster mm
        JOIN companymaster cm ON cm.companyid = mm.companyid AND cm.isdeleted = 0
        WHERE mm.isactive=1 AND mm.isdeleted=0 AND mm.companyid = ?`;

        const params = [companyId];

        const allData = await db.getResults(sql, params);

        sql += ` ORDER BY mm.menuid DESC`;

        if (length != -1) {
            sql += ` LIMIT ?, ?`;
            params.push(parseInt(start), parseInt(length));  // Ensure values are integers
        }

        const filteredData = await db.getResults(sql, params);

        return {
            "draw": draw,
            "totalFiltered": filteredData.length,
            "totalRecords": allData.length,
            "data": filteredData,
        };
    },

    orderLevelTax: async (companyId) => {
        return await db.getResults(`SELECT tpm.taxprofileid, tpm.taxprofilename, tpm.isdefault, tpm.taxpercentage FROM taxprofilemaster tpm WHERE tpm.companyid= ? AND tpm.isorderlevel = 1 AND tpm.isdeleted=0;`, [companyId])
    },

    // loadProductDropdownFromMenu: async (menuId) => {
    //     return await db.getResults(`SELECT pm.productid, pm.productname FROM menuproductdetails mpd
    //     JOIN productmaster pm ON pm.productid=mpd.productid AND pm.isdeleted=0
    //     JOIN portionmaster p ON p.portionid=mpd.portionid AND p.isdeleted=0
    //     WHERE mpd.isdeleted=0 AND mpd.menuId=?;`, [menuId]);
    // },

    getMenuData: async (menuId, companyId) => {
        return await db.getResults(`SELECT mm.menuid, mm.menuname, mm.locationid, mm.menutype, mm.isactive, mm.inclusiveexclusivegst, mm.companybrandmappingid, mm.ordertotaltaxprofileid FROM menumaster mm 
        WHERE mm.menuid=? AND mm.companyid=?;`, [menuId, companyId]);
    },

    loadProductFromMenu: async (req) => {
        const { companyId, menuId } = req.body;
        const { draw, start, length, search, sortField, sortOrder } = req.query;

        const getMenuDetails = await module.exports.getMenuData(menuId, companyId);

        let sql = `SELECT IF(mpd.menuproductid IS NOT NULL, 1, 0) AS isChecked, mpd.menuproductid, mpd.isrebateligible, IFNULL(bm.companybrandmappingid, 0) brandid, IFNULL(bm.brandname, "") brandname, pcm.productcategoryid, pcm.productcategoryname, IFNULL(psm.subcategoryname, "") subcategoryname, pm.productid, pm.productname, ppm.productportionid, p.portionid, IFNULL(p.portionname, "") portionname, IFNULL(mpd.productcode, "") productcode, mpd.price, mpd.actualprice AS taxprice, mpd.zomatoprice AS onlineprice, mpd.actualzomatoprice AS onlinetaxprice, mpd.taxprofileid, CASE WHEN pm.sellingproductas = 1 THEN "Goods" ELSE "Service" END AS sellingproductas, mpd.ispriceeditable, mpd.allownegativesale, cb.username AS createdby, DATE_FORMAT(mpd.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS modifiedby, IFNULL(DATE_FORMAT(mpd.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate
        FROM menuproductdetails mpd 
        JOIN productportionmaster ppm ON ppm.productportionid=mpd.productportionid AND ppm.isdeleted=0
        JOIN productmaster pm ON pm.productid=ppm.productid AND pm.isdeleted=0
        JOIN productcategorymaster pcm ON pcm.productcategoryid=pm.productcategoryid AND pcm.isdeleted=0
        LEFT JOIN productsubcategorymaster psm ON psm.subcategoryid=pm.subcategory AND psm.isdeleted=0
        LEFT JOIN companybrandmapping bm ON bm.companybrandmappingid=pcm.brandid AND bm.isdeleted=0
        JOIN portionmaster p ON p.portionid=ppm.portionid AND p.isdeleted=0
        JOIN usermaster cb ON cb.userid = ppm.createdby
        LEFT JOIN usermaster mb ON mb.userid = ppm.modifiedby
        WHERE ppm.isdeleted=0 AND ppm.companyid=? AND mpd.menuid=?`;

        const params = [companyId, menuId];

        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(pm.productname) LIKE LOWER(?) OR LOWER(pm.productcode) LIKE LOWER(?) OR LOWER(pcm.productcategoryname) LIKE LOWER(?) OR LOWER(psm.subcategoryname) LIKE LOWER(?) OR LOWER(bm.brandname) LIKE LOWER(?) OR LOWER(p.portionname) LIKE LOWER(?) OR LOWER(mpd.productcode) LIKE LOWER(?) OR LOWER(mpd.price) LIKE LOWER(?) OR LOWER(mpd.actualprice) LIKE LOWER(?) OR LOWER(mpd.zomatoprice) LIKE LOWER(?) OR LOWER(mpd.actualzomatoprice) LIKE LOWER(?) OR LOWER(pm.sellingproductas) LIKE LOWER(?) OR LOWER(mpd.ispriceeditable) LIKE LOWER(?) OR LOWER(mpd.allownegativesale) LIKE LOWER(?))`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}% `, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        const allData = await db.getResults(sql, params);
        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY pcm.productcategoryname, pm.productname`;
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
            "menuData": getMenuDetails.length > 0 ? getMenuDetails[0] : [{}],
            "data": filteredData,
        };
    },

    loadFreshProductsForMenu: async (req) => {
        const { draw, start, length, search, sortField, sortOrder } = req.query;
        const { productIds, companyId } = req.body;

        let sql = `SELECT 1 AS isChecked, 0 AS menuproductid, 0 AS isrebateligible,IFNULL(bm.companybrandmappingid,0) AS brandid, IFNULL(bm.brandname,'') AS brandname, pcm.productcategoryid, pcm.productcategoryname, IFNULL(pscm.subcategoryname,'') AS subcategoryname, pm.productid, pm.productname, ppm.productportionid, pmm.portionid, IFNULL(pmm.portionname,'') AS portionname, IFNULL(pm.productcode,'') AS productcode, ppm.price, ppm.price AS taxprice, ppm.price AS onlineprice, price AS onlinetaxprice, pm.taxprofileid, CASE WHEN pm.sellingproductas = 1 THEN 'Goods' ELSE 'Service' END AS sellingproductas, 0 AS ispriceeditable, 0 AS allownegativesale,cb.username AS createdby,DATE_FORMAT(ppm.createddate, '%d-%m-%Y %r') AS createddate,IFNULL(mb.username, '') AS modifiedby,IFNULL(DATE_FORMAT(ppm.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate
        FROM productportionmaster ppm
        JOIN portionmaster pmm ON pmm.portionid = ppm.portionid AND pmm.isdeleted = 0
        JOIN productmaster pm ON pm.productid = ppm.productid AND pm.isdeleted = 0
        JOIN productcategorymaster pcm ON pcm.productcategoryid = pm.productcategoryid AND pcm.isdeleted = 0
        LEFT JOIN productsubcategorymaster pscm ON pscm.subcategoryid = pm.subcategory AND pscm.isdeleted = 0 
        LEFT JOIN companybrandmapping bm ON bm.companybrandmappingid = pcm.brandid AND bm.isdeleted = 0
        JOIN usermaster cb ON cb.userid = ppm.createdby
        LEFT JOIN usermaster mb ON mb.userid = ppm.modifiedby
        WHERE ppm.isdeleted = 0 AND ppm.companyid = ?
        `;

        const params = [companyId];

        if (productIds.length > 0) {
            sql += ` AND ppm.productid IN (${productIds.map(() => '?').join(', ')})`;
            params.push(...productIds);
        }

        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(pcm.productcategoryname) LIKE LOWER(?) OR LOWER(pm.productname) LIKE LOWER(?) OR LOWER(pmm.portionname) LIKE LOWER(?) OR LOWER(pscm.subcategoryname) LIKE LOWER(?))`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }

        const allData = await db.getResults(sql, params);

        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY ppm.productid DESC`;
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

    createMenu: async (data, userId, ip) => {
        await db.beginTransaction();

        try {
            const duplicateMenuName = await db.getResults(`SELECT mm.menuid FROM menumaster mm WHERE LOWER(mm.menuname)=LOWER('${data.menuName}') AND mm.isdeleted=0;`);
            if (duplicateMenuName.length > 0) return { status: 409, success: 0, msg: `This Menu Name is already in Use.` }

            // Check for duplicate productCode within input data
            const seen = new Set();

            for (const product of data.menuProductsData) {
                const code = product.productCode;
                if (seen.has(code)) {
                    throw createError('All Product Code should be unique', 400);
                } else {
                    seen.add(code);
                }
            }


            const menuObj = {
                menuName: data.menuName,
                companyId: data.companyId,
                menuType: data.menuType,
                isActive: data.isActive,
                inclusiveExclusiveGst: data.inclusiveExclusiveGst,
                orderTotalTaxProfileId: data.orderTotalTaxProfileId || 0,
                companyBrandMappingId: data.companyBrandMappingId,
                isDeleted: 0,
                createdBy: userId,
                createdDate: moment().format('YYYY-MM-DD H:m:s'),
                ipaddress: ip,
            }
            const menuIdResp = await db.insert('menumaster', menuObj);
            const menuId = menuIdResp.insertId;

            if (!menuId) throw createError('Failed to Push Menu. Please try again', 500);

            for (const productData of data.menuProductsData) {
                if (!productData.isChecked) continue;

                const menuProductObj = {
                    menuId: menuId,
                    productPortionId: productData.productPortionId,
                    isSync: 0,
                    productPortionId: productData.productPortionId,
                    portionId: productData.portionId,
                    productId: productData.productId,
                    productCode: productData.productCode,
                    productCategoryId: productData.productCategoryId,

                    price: productData.posPrice,
                    zomatoPrice: productData.onlinePrice,
                    markupPrice: productData.onlinePrice,
                    swiggyPrice: productData.onlinePrice,
                    uberEatsPrice: productData.onlinePrice,
                    actualPrice: productData.taxPricePos,
                    actualZomatoPrice: productData.taxPriceOnline,
                    actualMarkupPrice: productData.taxPriceOnline,
                    actualSwiggyPrice: productData.taxPriceOnline,
                    actualUberEatsPrice: productData.taxPriceOnline,

                    taxProfileId: data.taxProfileId,
                    companyId: data.companyId,
                    isRebatEligible: productData.isRebateEligible,
                    serviceGoods: productData.serviceGoods,
                    // isOnline: productData.isOnline,
                    isPriceEditable: productData.priceEditable,
                    allowNegativeSale: productData.negativeSaleAllowed,

                    isDeleted: 0,
                    createdBy: userId,
                    createdDate: moment().format("YYYY-MM-DD H:m:s"),
                    ipAddress: ip,
                };

                const menuProductResp = await db.insert('menuproductdetails', menuProductObj);
                const menuProductId = menuProductResp.insertId;

                if (!menuProductId) throw createError('Failed to Push Menu Product. Please try again', 500);

                // if (!productData.isOnline) continue;

                // const onlineMenuProductObj = {
                //     menuProductId: menuProductId,
                //     menuId: menuId,
                //     locationId: data.locationId,
                //     productId: productData.productId,
                //     productPortionId: productData.productPortionId,
                //     price: productData.onlinePrice,
                //     companyId: data.companyId,
                //     channelId: data.channelId,      ///////////////////////////////////
                //     isRecommended: productData.isRecommend,
                //     stockInOut: 1,
                //     ipAddress: ip,
                //     createdBy: userId,
                //     createdDate: moment().format("YYYY-MM-DD H:m:s")
                // }

                // const onlineMenuProductResp = await db.insert('onlinemenudetails', onlineMenuProductObj);
                // const onlineMenuProductId = onlineMenuProductResp.insertId;

                // if (!onlineMenuProductId) throw createError('Failed to Push Online Menu Product. Please try again', 500);
            }

            await db.commit();
            return { status: 200, success: 1, msg: 'Menu Pushed Successfully' }
        } catch (error) {
            console.log('error....................', error);
            await db.rollback();
            winston.error(error);
            return { status: error.statusCode || 500, success: 0, msg: error.message }
        }
    },

    updateMenu: async (data, menuId, userId, ip) => {
        await db.beginTransaction();
        try {
            // Check for duplicate productCode within input data
            const seenCodes = new Set();
            const productCodes = [];
            const availableMenuProductIds = [];

            for (const product of data.menuProductsData) {
                const { productCode, isChecked, menuProductId } = product;

                if (seenCodes.has(productCode)) {
                    return { status: 409, success: 0, msg: 'All Product Code should be unique' };
                }
                seenCodes.add(productCode);
                productCodes.push(productCode);

                if (isChecked === 1 && menuProductId > 0) {
                    availableMenuProductIds.push(menuProductId);
                }
            }

            if (productCodes.length === 0) return { status: 400, success: 0, msg: 'No Product Codes provided' };

            const productPlaceholders = productCodes.map(() => '?').join(',');
            const idPlaceholders = availableMenuProductIds.map(() => '?').join(',');

            const query = `
                SELECT mpd.productcode 
                FROM menuproductdetails mpd 
                WHERE mpd.productcode IN (${productPlaceholders}) 
                AND mpd.menuid = ? 
                AND mpd.isdeleted = 0
                ${availableMenuProductIds.length > 0 ? `AND mpd.menuproductid NOT IN (${idPlaceholders})` : ''};
            `;

            const queryParams = [...productCodes, menuId, ...availableMenuProductIds];

            const duplicateProductCode = await db.getResults(query, queryParams);
            if (duplicateProductCode.length > 0) return { status: 409, success: 0, msg: 'All Product Code should be unique..' };

            const menuObj = {
                menuName: data.menuName,
                menuType: data.menuType,
                isActive: data.isActive,
                inclusiveExclusiveGst: data.inclusiveExclusiveGst,
                orderTotalTaxProfileId: data.orderTotalTaxProfileId || 0,
                companyBrandMappingId: data.companyBrandMappingId || null,
                modifiedBy: userId,
                modifiedDate: moment().format('YYYY-MM-DD H:m:s'),
                ipAddress: ip,
            }
            const menuUpdateResp = await db.getResults(`UPDATE menumaster SET ? WHERE menuid=? AND isdeleted=0;`, [menuObj, menuId]);
            if (menuUpdateResp.affectedRows === 0) throw createError('Failed to Update Menu. Please try again', 500);

            const unCheckedMenuProductIds = data.menuProductsData.filter(product => product.isChecked === 0).map(product => product?.menuProductId > 0 ? product.menuProductId : null);

            const checkedProduct = data.menuProductsData.filter(product => product.isChecked === 1);

            if (unCheckedMenuProductIds.length > 0) {
                const placeholders = unCheckedMenuProductIds.map(() => '?').join(',');

                const sql = `UPDATE menuproductdetails mpd SET mpd.isdeleted = 1, mpd.modifiedby = ?, mpd.modifieddate = ?, mpd.ipaddress = ? WHERE mpd.menuproductid IN (${placeholders})`;

                const params = [userId, moment().format('YYYY-MM-DD H:mm:ss'), ip, ...unCheckedMenuProductIds];
                await db.getResults(sql, params);
            }
            for (const productData of checkedProduct) {
                // Check Product here, whether they exists or Not
                if (productData.menuProductId > 0) {
                    const menuProductObj = {
                        productCode: productData.productCode,
                        price: productData.posPrice,
                        zomatoPrice: productData.onlinePrice,
                        markupPrice: productData.onlinePrice,
                        swiggyPrice: productData.onlinePrice,
                        uberEatsPrice: productData.onlinePrice,
                        taxProfileId: productData.taxProfileId,
                        actualPrice: productData.taxPricePos,
                        actualZomatoPrice: productData.taxPriceOnline,
                        actualMarkupPrice: productData.taxPriceOnline,
                        actualSwiggyPrice: productData.taxPriceOnline,
                        actualUberEatsPrice: productData.taxPriceOnline,
                        serviceGoods: productData.serviceGoods,
                        isPriceEditable: productData.priceEditable,
                        allowNegativeSale: productData.negativeSaleAllowed,
                        modifiedBy: userId,
                        modifiedDate: moment().format("YYYY-MM-DD H:m:s"),
                    };

                    const resp = await db.getResults(`UPDATE menuproductdetails SET ? WHERE menuproductid = ? AND isdeleted = 0`, [menuProductObj, productData.menuProductId]);
                    if (resp.affectedRows === 0) throw createError('Failed to Update Menu Product. Please try again', 500);

                } else {
                    const menuProductObj = {
                        productPortionId: productData.productPortionId,
                        isSync: 0,
                        menuId: menuId,
                        portionId: productData.portionId,
                        productId: productData.productId,
                        productCode: productData.productCode,
                        productCategoryId: productData.productCategoryId,

                        price: productData.posPrice,
                        zomatoPrice: productData.onlinePrice,
                        markupPrice: productData.onlinePrice,
                        swiggyPrice: productData.onlinePrice,
                        uberEatsPrice: productData.onlinePrice,
                        actualPrice: productData.taxPricePos,
                        actualZomatoPrice: productData.taxPriceOnline,
                        actualMarkupPrice: productData.taxPriceOnline,
                        actualSwiggyPrice: productData.taxPriceOnline,
                        actualUberEatsPrice: productData.taxPriceOnline,

                        taxProfileId: data.taxProfileId,
                        companyId: data.companyId,
                        isRebatEligible: productData.isRebateEligible,
                        serviceGoods: productData.serviceGoods,
                        isOnline: productData.isOnline,
                        isPriceEditable: productData.priceEditable,
                        allowNegativeSale: productData.negativeSaleAllowed,

                        isDeleted: 0,
                        createdBy: userId,
                        createdDate: moment().format("YYYY-MM-DD H:m:s"),
                        ipAddress: ip,
                    };

                    const menuProductResp = await db.insert('menuproductdetails', menuProductObj);

                    if (!menuProductResp.insertId) throw createError('Failed to Update Menu. Please try again', 500);
                }
            }

            await db.commit();
            return { status: 200, success: 1, msg: "Menu Update Successfully" }
        }
        catch (error) {
            await db.rollback();
            winston.error(error);
            return { status: error.statusCode || 500, success: 0, msg: error.message }
        }
    }
}