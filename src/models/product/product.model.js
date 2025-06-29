const winston = require('../../config/winston');
const db = require('../../config/db');
const moment = require("moment");
const { createError } = require('../../utils/errorHandler.utils');
const taxModal = require('../tax.model');
// const date = moment();

const calcTaxprice = (isIncExc, tax, price) => {
    if (isIncExc) {
        return price / (1 + tax / 100);
    } else {
        return price + (price * (tax / 100));
    }
}

module.exports = {

    getProductData: async (id) => {
        const resp = await db.getResults(`SELECT pm.productimage as productbuffer, pm.onlineimg, pm.productimg, tpm.taxpercentage FROM productmaster pm 
        JOIN taxprofilemaster tpm ON tpm.taxprofileid = pm.taxprofileid AND tpm.isdeleted = 0 WHERE pm.productid = ? AND pm.isdeleted = 0;`, [id]);
        return resp;
    },

    getProduct: async (data, id) => {
        const sql = ` SELECT COUNT(pm.productid) AS count FROM productmaster pm WHERE pm.isdeleted=0 AND pm.companyid = ?  AND pm.productcategoryid = ?  ${id > 0 ? ` AND pm.productid != ?` : ''}  AND pm.productcode = ? 
        UNION ALL 
        SELECT COUNT(pm.productid) AS count FROM productmaster pm WHERE pm.isdeleted=0 AND pm.companyid = ?  AND pm.productcategoryid = ?  ${id > 0 ? ` AND pm.productid != ?` : ''}  AND LOWER(pm.productname) = ?`;

        let params = [data.companyId, data.prodCatId];

        if (id > 0) params.push(id);

        params.push(data.prodCode, data.companyId, data.prodCatId);
        // params.push();

        if (id > 0) params.push(id);

        params.push(data.prodName.toLowerCase());

        return await db.getResults(sql, params);
    },
    getProductDataById: async (id) => {
        const sql = `SELECT ppm.price ,pm.productid, pm.productname, IFNULL(pm.productcode, '') productcode, pm.isactive, pm.productcategoryid, IFNULL(pm.subcategory, 0) AS subcategory, pm.appearancesid, pm.unitprice, pm.taxprofileid, IFNULL(pm.description, '') description, IFNULL(pm.productimg, '') productimg, IFNULL(pm.onlineimg, '') onlineimg, CASE WHEN pm.sellingproductas=1 THEN 'Goods' WHEN pm.sellingproductas=2 THEN 'Service' ELSE '' END AS sellingproductasvalue, IFNULL(pm.sellingproductas, '')  sellingproductas, IFNULL(pm.hsnseccode, '') hsnseccode, pm.isveg, IFNULL(pm.backcolor, '') backcolor, pm.isvisible,pm.ismodifiermandatory, pm.ignoretax, pm.ignorediscount, pm.recomendedproduct, IFNULL(pm.surveinginformation, "") surveinginformation, IFNULL(pm.nutritioninformation, "") nutritioninformation, ppm.productportionid, ppm.isdefault, p.portionid, p.portionname
        FROM productmaster pm
        JOIN  productportionmaster ppm ON ppm.productid = pm.productid AND ppm.isdeleted = 0
        JOIN  portionmaster p ON p.portionid = ppm.portionid AND p.isdeleted = 0
        WHERE pm.isdeleted=0 AND pm.productid=? GROUP BY p.portionid;`;
        const res = await db.getResults(sql, [id]);
        if (!res?.length) return { success: 0, msg: 'No Data Found' };

        let product = {
            productId: res[0].productid,
            productName: res[0].productname,
            productCode: res[0].productcode,
            productCategoryId: res[0].productcategoryid,
            subCategory: Number(res[0].subcategory),
            appearancesId: res[0].appearancesid || 0,
            unitPrice: Number(res[0].unitprice),
            taxProfileId: res[0].taxprofileid,
            description: res[0].description,
            productImg: res[0].productimg,
            onlineImg: res[0].onlineimg,
            sellingProductAsValue: res[0].sellingproductasvalue,
            sellingProductAs: res[0].sellingproductas,
            hsnSecCode: res[0].hsnseccode,
            isVeg: res[0].isveg,
            backColor: res[0].backcolor,
            isVisible: res[0].isvisible,
            isModifierMandatory: res[0].ismodifiermandatory,
            ignoreTax: res[0].ignoretax,
            ignoreDiscount: res[0].ignorediscount,
            recommendedProduct: res[0].recomendedproduct,
            surveingInformation: res[0].surveinginformation || "",
            nutritionInformation: res[0].nutritioninformation || "",
            isActive: res[0].isactive
        };

        let prodPortion = [];
        for (let i = 0; i < res.length; i++) {
            const obj = {
                productPortionId: res[i].productportionid,
                isDefault: res[i].isdefault,
                portionId: res[i].portionid,
                portionName: res[i].portionname,
                price: Number(res[i].price),
            };
            prodPortion.push(obj);
        }
    
        const tagSql = `SELECT pm.productid, ptm.tagid, tm.tagname, tm.tagimage FROM producttagmapping ptm 
                        JOIN productmaster pm ON pm.productid = ptm.productid AND pm.isdeleted = 0
                        JOIN tagmaster tm ON tm.tid = ptm.tagid 
                        WHERE pm.productid = ? AND ptm.isdeleted = 0 AND tm.isdeleted = 0;`;

                const tagRes = await db.getResults(tagSql, [id]);

                product.tags = tagRes.map(tag => ({
                tid: tag.tagid,
                tagname: tag.tagname,
                tagImage: tag.tagimage
            }));


        // Insert portion details into product object
        product.portionDetails = prodPortion;
        return { success: 1, msg: 'Fetched Successfully', data: product };
    },
    addUpdateProduct: async (data) => {
        // Last arguments refers to productid. If productid found that means update product
        let prodObj = {
            productname: data.prodName,
            productcode: data.prodCode,
            productcategoryid: data.prodCatId,
            subcategory: data.prodSubCatId || null,
            taxprofileid: data.taxProfileId,
            unitprice: data.foodCost, //
            description: data.prodDesc,
            productimage: data.prodImgBase64 == undefined ? null : data.prodImgBase64,
            backcolor: data.color,
            sellingproductas: data.sellItemAs,
            hsnseccode: data.hsnSecCode,
            // modifierlevel: data.prodName,
            // isactive: data.dispOnDashboard, // 111
            ignoretax: data.ignoreTax,
            ignorediscount: data.ignoreDisc,
            ismodifiermandatory: data.isMandModSel, //
            isvisible: data.dispOnDashboard, //
            isactive: data.isActive, //
            isveg: data.vegNonveg,
            // productimg: data?.prodImg || null,
            // onlineimg: data?.onlineImg || null,
            productimg: data.prodImg == undefined ? null : data.prodImg,
            onlineimg: data.onlineImg == undefined ? null : data.onlineImg,

            ipaddress: data.ip,
            appearancesid: data.prodAppearances,
            companyid: data.companyId,
            userid: data.userId,
            // hsncode: data.hsnCode,
            recomendedproduct: data.isRecommend,
            surveinginformation: data.surveingInformation || "",
            nutritioninformation: data.nutritionInformation || "",
            // companybrandmappingid: data.prodName,
        }

        if (data.productId > 0) {
            prodObj.modifiedby = data.userId,
                prodObj.modifieddate = moment().format("YYYY-MM-DD H:m:s");

            // const dataToUpdate = Object.keys(prodObj).map(key => ({
            //     column: key,
            //     value: "'" + prodObj[key] + "'"
            // }));
            const dataToUpdate = Object.keys(prodObj).map(key => ({
                column: key,
                value: prodObj[key] === null ? null : `'${prodObj[key]}'`  // Fix here
            }));


            const whereCondition = [{ column: 'productid', value: data.productId }];
            const resp = await db.update('productmaster', dataToUpdate, whereCondition);
            return resp.affectedRows;
        }

        prodObj.createdby = data.userId,
            prodObj.createddate = moment().format("YYYY-MM-DD H:m:s");
        const prodResp = await db.insert('productmaster', prodObj);
        return prodResp.insertId;
    },

    addUpdateProductPortions: async (data, productPortionId) => {
        // If productPortionId found, that means update productportion

        let prodPortionObj = {
            portionid: data.portion.portionId,
            productid: data.productId,
            price: data.portion.posPrice,
            isdefault: data.portion.isDefault,
            isdeleted: 0,
            ipaddress: data.ip,
            companyid: data.companyId,
        }
        if (productPortionId > 0) {
            prodPortionObj.modifiedby = data.userId,
                prodPortionObj.modifieddate = moment().format("YYYY-MM-DD H:m:s");

            const dataToUpdate = Object.keys(prodPortionObj).map(key => ({
                column: key,
                value: "'" + prodPortionObj[key] + "'"
            }));
            const whereCondition = [{ column: 'productportionid', value: productPortionId }];
            const resp = await db.update('productportionmaster', dataToUpdate, whereCondition);
            return resp.affectedRows;
        }
        prodPortionObj.createdby = data.userId,
            prodPortionObj.createddate = moment().format("YYYY-MM-DD H:m:s");

        const prodPortionResp = await db.insert('productportionmaster', prodPortionObj);
        return prodPortionResp.insertId;
    },

    addUpdateMenuProductDetails: async (data) => {
        let menuProdObj = {
            productportionid: data.productPortionId,
            issync: 0,
            menuid: data.menuId,
            portionid: data.portion.portionId,
            productid: data.productId,
            productcode: data.portion.prodCode,
            productcategoryid: data.prodCatId,
            price: data.portion.posPrice,
            zomatoprice: data.portion.onlinePrice,
            markupprice: data.portion.markupPrice,
            swiggyprice: data.portion.onlinePrice,
            isdeleted: 0,
            actualprice: calcTaxprice(data.isIncExc, data.tax, data.portion.posPrice),
            actualzomatoprice: calcTaxprice(data.isIncExc, data.tax, data.portion.onlinePrice),
            actualmarkupprice: calcTaxprice(data.isIncExc, data.tax, data.portion.markupPrice),
            actualswiggyprice: calcTaxprice(data.isIncExc, data.tax, data.portion.onlinePrice),
            taxprofileid: data.taxProfileId,
            companyid: data.companyId,
            ipaddress: data.ip,
            isrebateligible: data.isRebatEligible || 0,
            servicegoods: data.sellItemAs || 0,
            isonline: data.isOnlineSell,
            ispriceeditable: data.isPriceEditable || 0,
            allownegativesale: data.allowNegativeSale || 0,
            createdby: data.userId,
            createddate: moment().format("YYYY-MM-DD H:m:s")
        };

        const prodPortionResp = await db.insert('menuproductdetails', menuProdObj);
        return prodPortionResp.insertId;
    },

    onlineAddUpdMenuProdDetails: async (data) => {
        const onlineMenuProdObj = {
            menuproductid: data.menuProductId,
            menuid: data.menuId,
            locationid: data.locationId,
            productid: data.productId,
            productportionid: data.productPortionId,
            companyid: data.companyId,
            channelid: data.channelId,
            price: data.onlinePrice,
            // sortnumber: , //
            isrecommended: data.isRecommend,
            stockinout: 1,
            // brandid: ,
            ipaddress: data.ip,
            createdby: data.userId,
            createddate: moment().format("YYYY-MM-DD H:m:s")
        };

        const prodPortionResp = await db.insert('onlinemenudetails', onlineMenuProdObj);
        return prodPortionResp.insertId;
    },


    insertProduct: async (data, userId, ip) => {
        try {
            await db.beginTransaction();
            data.userId = userId;
            data.ip = ip;
            const productId = await module.exports.addUpdateProduct(data);
            if (!(productId > 0)) throw createError('Failed to insert product. Please try again!', 400)

            if (data.productTagIds.length > 0) {
                const placeholders = data.productTagIds.map(() => '?').join(',');
                const query = `SELECT tagid FROM producttagmapping WHERE productid = ? AND tagid IN (${placeholders}) AND isdeleted = 0`;
                const existing = await db.getResults(query, [productId, ...data.productTagIds]);

                const existingTagIds = existing.map(row => row.tagid);
                const newTagIds = data.productTagIds.filter(id => !existingTagIds.includes(id));

                for (let tagId of newTagIds) {
                    const mappingRow = {
                        productid: productId,
                        tagid: tagId,
                    };
                    await db.insert('producttagmapping', mappingRow);
                }
            }


            const taxPercentage = await taxModal.getTax(data.taxProfileId);
            for (const portion of data.portions) {

                const productPortionObj = {
                    companyId: data.companyId,
                    portion,
                    productId,
                    userId,
                    ip
                }
                const productPortionId = await module.exports.addUpdateProductPortions(productPortionObj);
                if (!productPortionId) return res.status(500).json({ success: 0, message: "Failed to insert product portion. Please try again!" });
                
                let menuProductId = 0;

                for (const menuId of data.menuId || []) {
                    const taxResult = await taxModal.isIncExcTax(menuId);
                    const isInclusive = taxResult?.length > 0 ? taxResult[0].inclusiveexclusivegst : 0;

                    const menuProductObj = {
                        menuId,
                        portion,
                        productId,
                        productPortionId,
                        userId,
                        ip,
                        tax: taxPercentage[0].taxpercentage,
                        isIncExc: isInclusive,
                        taxProfileId: data.taxProfileId,
                        companyId: data.companyId,
                        isOnlineSell: data.isOnlineSell,
                        prodCatId: data.prodCatId,
                        isRebatEligible: data.isRebatEligible,
                        sellItemAs: data.sellItemAs,
                        isPriceEditable: data.isPriceEditable,
                        allowNegativeSale: data.allowNegativeSale
                    }
                    menuProductId = await module.exports.addUpdateMenuProductDetails(menuProductObj);

                }

                if (!data.isOnlineSell) continue;

                const locations = data.locationId;
                const channels = data.channelId;
                const menuIds = await db.getResults(
                    `SELECT sm.locationid, sm.channelid, sm.menuid 
                    FROM storemaster sm 
                    WHERE sm.isdeleted = 0 
                    AND sm.locationid IN (${locations.map(() => '?').join(',')}) 
                    AND sm.channelid IN (${channels.map(() => '?').join(',')});`,
                    [...locations, ...channels]
                );
                for (const menu of menuIds) {

                    const onlineMenuProductObj = {
                        companyId: data.companyId,
                        isRecommend: data.isRecommend,
                        locationId: menu.locationid,
                        menuId: menu.menuid,
                        channelId: menu.channelid,
                        onlinePrice: portion.onlinePrice,
                        productId,
                        productPortionId,
                        menuProductId,
                        userId,
                        ip
                    }
                    await module.exports.onlineAddUpdMenuProdDetails(onlineMenuProductObj);

                }
            }
            await db.commit();
            return { status: 201, success: 1, msg: 'Product Inserted Successfully' }

        } catch (error) {
            await db.rollback();
            winston.error(error);
            return { status: error.statusCode || 500, success: 0, msg: error.message }
        }
    },

    updateProduct: async (data, userId, ip, productId) => {
        try {
            await db.beginTransaction();
            data.userId = userId;
            data.ip = ip;
            data.productId = productId;
            const updateProductResp = await module.exports.addUpdateProduct(data);
            if (!updateProductResp) throw createError('Failed to Update product. Please try again!', 500)

            if (data.productTagIds.length > 0) {
                const incomingTagIds = data.productTagIds;
                const existing = await db.getResults(`SELECT tagid, isdeleted FROM producttagmapping WHERE productid = ?`, [productId]);

                const existingTagMap = new Map(existing.map(row => [row.tagid, row.isdeleted]));

                for (let tagId of incomingTagIds) {
                    if (!existingTagMap.has(tagId) || existingTagMap.get(tagId) === 1) {
                        await db.insert('producttagmapping', { productid: productId, tagid: tagId });
                    }
                }
                const tagIdsToDelete = existing.filter(row => row.isdeleted === 0 && !incomingTagIds.includes(row.tagid)).map(row => row.tagid);

                if (tagIdsToDelete.length) {
                    const placeholders = tagIdsToDelete.map(() => '?').join(',');
                    await db.getResults(`UPDATE producttagmapping SET isdeleted = 1 WHERE productid = ? AND tagid IN (${placeholders})`,[productId, ...tagIdsToDelete]);
                }
            }

            // Delete portions which is not present into payload.
            const portIds = Array.isArray(data.portions) ? data.portions.map(portion => portion?.productPortionId).filter(id => !!id) : [];

            const defaultPort = data.portions.filter((portion) => portion.isDefault === 1);

            if (defaultPort.length > 1) throw createError('Multiple portions is not allowed to be default', 400)

            if (portIds.length > 0) {
                await db.getResults(
                    `UPDATE productportionmaster ppm 
                     SET ppm.isdeleted = 1, 
                         ppm.modifiedby = ?, 
                         ppm.modifieddate = ?,
                         ppm.ipaddress=?
                     WHERE  ppm.productportionid NOT IN (${portIds.map(() => '?').join(',')}) 
                     AND ppm.productid = ?
                     `,
                    [userId, moment().format("YYYY-MM-DD H:m:s"), ip, ...portIds, productId]
                );
            } else {
                await db.getResults(
                    `UPDATE productportionmaster ppm 
                    SET ppm.isdeleted = 1, 
                    ppm.modifiedby = ?, 
                    ppm.modifieddate = ?,
                    ppm.ipaddress=?
                    WHERE  ppm.productid=?
                    `,
                    [userId, moment().format("YYYY-MM-DD H:m:s"), ip, productId]
                );
            }

            let existingResults = [];
            let existingPortionIds = [];

            if (portIds.length > 0) {
                existingResults = await db.getResults(
                    `SELECT productportionid 
                     FROM productportionmaster 
                     WHERE productportionid IN(${portIds.map(() => '?').join(',')}) 
                     AND isdeleted = 0`,
                    [...portIds]
                );

                existingPortionIds = existingResults.map(p => p.productportionid);
            }

            const newPortions = [];
            const existingPortions = [];

            for (const portion of data.portions) {
                if (existingPortionIds.includes(portion.productPortionId)) {
                    existingPortions.push(portion);
                } else {
                    newPortions.push(portion);
                }
            }

            for (let portion of existingPortions) {
                const productPortionObj = {
                    companyId: data.companyId,
                    portion: portion,
                    productId,
                    userId,
                    ip
                };
                await module.exports.addUpdateProductPortions(productPortionObj, portion.productPortionId);
            }

            for (let portion of newPortions) {
                const productPortionObj = {
                    companyId: data.companyId,
                    portion: portion,
                    productId,
                    userId,
                    ip
                };
                await module.exports.addUpdateProductPortions(productPortionObj);
            }

            await db.commit();
            return { status: 200, success: 1, msg: 'Product Updated Successfully' }

        } catch (error) {
            await db.rollback();
            winston.error(error);
            return { status: error.statusCode || 500, success: 0, msg: error.message }
        }
    },

    fetchProducts: async (req) => {
        const { companyId } = req.body;
        const { draw, start, length, search, sortField, sortOrder } = req.query;

        let sql = `SELECT pm.productid, pm.productname, pm.productcode, pm.productcategoryid, IFNULL(pcm.productcategoryname, '') AS productcategoryname, IFNULL(pcm.brandid, 0) AS brandid, IFNULL(bm.brandname, '') AS brandname, pm.unitprice, IFNULL(pm.backcolor, '') AS backcolor, pm.isveg, CASE WHEN pm.isveg=1 THEN 'veg' ELSE 'nonveg' END AS 'isVegNonveg', CASE WHEN pm.ignoretax=1 THEN 'Yes' ELSE 'No' END AS 'ignoretax', CASE WHEN pm.ignorediscount=1 THEN 'Yes' ELSE 'No' END AS 'ignorediscount', cb.username AS createdby, DATE_FORMAT(pm.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS modifiedby, IFNULL(DATE_FORMAT(pm.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate
        FROM productmaster pm 
        JOIN productcategorymaster pcm ON pcm.productcategoryid = pm.productcategoryid AND pcm.isdeleted = 0
        LEFT JOIN companybrandmapping bm ON bm.companybrandmappingid = pcm.brandid AND bm.isdeleted = 0
        JOIN usermaster cb ON cb.userid = pm.createdby
        LEFT JOIN usermaster mb ON mb.userid = pm.modifiedby
        WHERE pm.isdeleted=0 AND pm.companyid = ?
        `;
        let params = [companyId];

        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(pm.productname) LIKE LOWER(?) OR LOWER(pm.productcode) LIKE LOWER(?) OR LOWER(pcm.productcategoryname) LIKE LOWER(?) OR LOWER(bm.brandname) LIKE LOWER(?) OR LOWER(pm.unitprice) LIKE LOWER(?))`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        const allData = await db.getResults(sql, params);

        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY pm.productid DESC`;
        }

        if (length != -1) {
            sql += ` LIMIT ?, ?`;
            params.push(parseInt(start), parseInt(length))
        }

        const filteredData = await db.getResults(sql, params);

        return {
            "draw": draw,
            "totalFiltered": filteredData.length,
            "totalRecords": allData.length,
            "data": filteredData,
        };
    },

    getMultipleImagePath: async (productIds) => {
        let sql = `SELECT onlineimg, productimg FROM productmaster WHERE productid IN (?) AND isdeleted = 0`
        let resp = await db.getResults(sql, [productIds])
        return resp;
    },

    getMenuPrice: async (id) => {
        return await db.getResults(`SELECT mm.menuid, mm.menuname, mm.locationid, p.productid, ppm.productportionid, p.productname, pm.portionname, mpd.price, mpd.zomatoprice AS 'onlineprice', mpd.markupprice, mpd.ispriceeditable FROM menumaster mm
            JOIN menuproductdetails mpd ON mpd.menuid=mm.menuid AND mpd.isdeleted=0
            JOIN productportionmaster ppm ON ppm.productportionid=mpd.productportionid AND ppm.isdeleted=0
            JOIN productmaster p ON p.productid=ppm.productid AND p.isdeleted=0
            JOIN portionmaster pm ON pm.portionid=mpd.portionid AND pm.isdeleted=0
            WHERE mm.isactive=1 AND mm.isdeleted=0 AND mpd.productid=?`, [id]);
    },

    getLocationChannelList: async (id, data) => {
        const locationIds = data.locations;
        return await db.getResults(`SELECT case when omd.onlinemenuid IS NOT NULL then 1 ELSE 0 END AS is_associated, sm.storeid, sm.storename, sm.locationid, cm.channelid, cm.channelname,sm.menuid
        FROM storemaster sm
        JOIN channelmaster cm ON cm.channelid=sm.channelid AND cm.isdeleted=0
        LEFT JOIN onlinemenudetails omd ON sm.locationid=omd.locationid AND sm.menuid=omd.menuid AND sm.channelid=omd.channelid AND omd.isdeleted=0 AND omd.productid=?
        WHERE sm.isdeleted=0 AND sm.locationid IN(${locationIds.map(() => '?').join(',')})  GROUP BY sm.storeid;`, [id, ...locationIds]);
    },

    updateMenuPrice: async (data) => {
        const products = data.products;
        db.beginTransaction();

        const getProductId = await db.getResults(`SELECT ppm.productid FROM productportionmaster ppm WHERE ppm.productportionid=${products[0].productPortionId} AND ppm.isdeleted=0;`);

        const taxResult = await module.exports.getProductData(getProductId[0]?.productid);
        if (!taxResult?.length) {
            return { success: 0, msg: 'Tax details not found', status: 400 };
        }
        const taxPercentage = taxResult[0].taxpercentage;

        for (let i = 0; i < products.length; i++) {
            const isIncExc = await taxModal.isIncExcTax(products[i].menuId);

            const actualPrice = await calcTaxprice(isIncExc, taxPercentage, products[i].price);
            const actualOnlinePrice = await calcTaxprice(isIncExc, taxPercentage, products[i].onlinePrice);
            const actualMarkupPrice = await calcTaxprice(isIncExc, taxPercentage, products[i].markupPrice);

            const resp = await db.getResults(`UPDATE menuproductdetails mpd  SET mpd.price = ?, mpd.zomatoprice = ?, mpd.swiggyprice = ?, mpd.ubereatsprice = ?, mpd.markupprice = ?, mpd.actualprice = ?, mpd.actualzomatoprice = ?, mpd.actualswiggyprice = ?, mpd.actualubereatsprice = ?, mpd.actualmarkupprice = ? 
            WHERE mpd.isdeleted=0 AND mpd.productportionid = ? 
            AND mpd.menuid = ?;`, [products[i].price, products[i].onlinePrice, products[i].onlinePrice, products[i].onlinePrice, products[i].markupPrice, actualPrice, actualOnlinePrice, actualOnlinePrice, actualOnlinePrice, actualMarkupPrice, products[i].productPortionId, products[i].menuId]);

            if (!resp.affectedRows) return { status: 500, success: 0, msg: 'Failed to Update product. Please try again !' }
        }
        db.commit();
        return { status: 200, success: 1, msg: 'Menu Updated Successfully' }
    },

    getProductMenuMapping: async (companyId, id) => {
        return await db.getResults(`SELECT mm.menuid, mm.menuname,  CASE WHEN mpd.productid = ? THEN 1 ELSE 0 END AS is_associated FROM menumaster mm LEFT JOIN menuproductdetails mpd  ON mm.menuid = mpd.menuid AND mpd.isdeleted = 0 AND mpd.productid = ? WHERE mm.isactive=1 AND mm.companyid = ? AND mm.isdeleted = 0  GROUP BY mm.menuid;`, [id, id, companyId]);
    },

    updateProductMenuMapping: async (data, productId, userId, ip) => {
        db.beginTransaction();
        try {
            const menuIds = data.menuArray.map(item => item.menuId);
            const currentTime = moment().format("YYYY-MM-DD H:m:s");

            // Mark menus as deleted if they are not in the updated menu list
            if (menuIds.length > 0) {
                // Case: Update existing menus (excluding those in menuIds)
                await db.getResults(
                    `UPDATE menuproductdetails 
                     SET isdeleted = 1, modifiedby = ?, modifieddate = ? 
                     WHERE menuid NOT IN (${menuIds.map(() => '?').join(',')}) 
                     AND productid = ? AND companyid = ?;`,
                    [userId, currentTime, ...menuIds, productId, data.companyId]
                );
            } else {
                // Case: No menu IDs, delete all related menus
                await db.getResults(
                    `UPDATE menuproductdetails 
                     SET isdeleted = 1, modifiedby = ?, modifieddate = ? 
                     WHERE productid = ? AND companyid = ?;`,
                    [userId, currentTime, productId, data.companyId]
                );
            }

            if (menuIds.length == 0) {
                return { success: 1, msg: 'All Product is Unlinked', status: 200 }
            }
            // Fetch existing menu-product mappings
            const existingMenus = await db.getResults(
                `SELECT menuid 
                 FROM menuproductdetails 
                 WHERE menuid IN (${menuIds.map(() => '?').join(',')}) 
                 AND productid = ? 
                 AND isdeleted = 0 
                 GROUP BY menuid;`,
                [...menuIds, productId]
            );


            // Determine new menus that need to be added
            const existingMenuIds = existingMenus.map(row => row.menuid);
            const newMenuIds = menuIds.filter(menuId => !existingMenuIds.includes(menuId));

            // Fetch tax details
            const taxResult = await module.exports.getProductData(productId);
            if (!taxResult?.length) {
                return { success: 0, msg: 'Tax details not found', status: 400 };
            }
            const taxPercentage = taxResult[0].taxpercentage;

            // Fetch product and portion details
            const productData = await db.getResults(
                `SELECT ppm.productportionid, ppm.portionid, ppm.productid, ppm.price, ppm.isdefault, ppm.companyid, 
                        pm.productcategoryid AS prodCatId, pm.subcategory AS prodSubCatId, pm.taxprofileid AS taxProfileId, 
                        pm.sellingproductas, pm.hsnseccode, pm.modifierlevel, pm.isactive, pm.ignoretax, pm.ignorediscount, 
                        pm.ismodifiermandatory, pm.isvisible, pm.isveg, pm.appearancesid, pm.productcode  
                 FROM productportionmaster ppm 
                 JOIN productmaster pm ON pm.productid = ppm.productid AND pm.isdeleted = 0
                 WHERE ppm.productid = ? AND ppm.isdeleted = 0;`,
                [productId]
            );

            if (!productData?.length) {
                return { success: 0, msg: 'Product Not Found', status: 400 };
            }

            // Assign company ID
            // productData.push(companyId) = data.companyId;
            productData[0].companyId = data.companyId;

            // Loop through new menus and link product-portions
            for (const menuId of newMenuIds) {
                const taxInfo = await taxModal.isIncExcTax(menuId);
                for (const product of productData) {
                    const isInclusive = taxInfo?.length > 0 ? taxInfo[0].inclusiveexclusivegst : 0;

                    const portionDetails = {
                        portionId: product.portionid,
                        prodCode: product.productcode,
                        posPrice: product.price,
                        onlinePrice: product.price,
                        markupPrice: product.price
                    };

                    const menuProductObj = {
                        menuId: menuId,
                        portion: portionDetails,
                        productId: productId,
                        productPortionId: product.productportionid,
                        userId: userId,
                        ip: ip,
                        tax: taxPercentage,
                        isIncExc: isInclusive,
                        taxProfileId: product.taxProfileId,
                        companyId: product.companyid,
                        isOnlineSell: data.isOnlineSell,
                        prodCatId: product.prodCatId,
                        isRebatEligible: data.isRebatEligible || 0,
                        sellItemAs: data?.sellItemAs || 0,
                        isPriceEditable: data?.isPriceEditable || 0,
                        allowNegativeSale: data?.allowNegativeSale || 0
                    }

                    const menuProductId = await module.exports.addUpdateMenuProductDetails(menuProductObj);

                    if (!menuProductId) {
                        return { success: 0, status: 500, msg: 'Failed to Associate/Link product into New Menu' };
                    }
                }
            }

            db.commit();
            return { status: 200, success: 1, msg: 'Menu Updated Successfully' };
        } catch (error) {
            await db.rollback();
            winston.error(error);
            return { status: error.statusCode || 500, success: 0, msg: error.message }
        }
    },

    updateProductOnlineMapping: async (data, id, userId, ip) => {
        db.beginTransaction();
        try {
            const locationChannelPairs = data.locationArray.map(() => '(?, ?)').join(', ');
            const params = data.locationArray.flatMap(loc => [loc.locationId, loc.channelId]);

            params.push(id, data.companyId);

            if (data.locationArray.length > 0) {
                // Case: Update existing menus (excluding those in menuIds)
                await db.getResults(
                    `UPDATE onlinemenudetails 
                    SET isdeleted = 1
                    WHERE (locationid, channelid) NOT IN (${locationChannelPairs}) 
                    AND productid = ? 
                    AND companyid = ?;`,
                    params
                );
            } else {
                await db.getResults(
                    `UPDATE onlinemenudetails 
                         SET isdeleted = 1, modifiedby = ?, modifieddate = ? 
                         WHERE productid = ? AND companyid = ?;`,
                    [userId, moment().format('YYYY-MM-DD HH:mm:ss'), id, data.companyId]
                );
            }

            if (data.locationArray.length == 0) {
                return { success: 1, msg: 'All Product is Unlinked with Online Menu', status: 200 }
            }

            const resp = await db.getResults(
                `SELECT omd.locationid, omd.channelid 
                FROM onlinemenudetails omd 
                WHERE (omd.locationid, omd.channelid) IN (${locationChannelPairs}) 
                AND omd.productid = ? 
                AND omd.isdeleted = 0 
                AND omd.companyid = ?
                GROUP BY omd.locationid, omd.channelid;`,
                params
            );

            const existingPairs = resp.map(row => `${row.locationid}-${row.channelid}`);
            const newLocationChannels = data.locationArray.filter(loc =>
                !existingPairs.includes(`${loc.locationId}-${loc.channelId}`)
            );

            const getProdFromMenu = await db.getResults(`SELECT mpd.menuproductid, mpd.productid, mpd.productportionid, pm.recomendedproduct, ppm.price
            FROM menuproductdetails mpd
            JOIN productmaster pm ON pm.productid=mpd.productid AND pm.isdeleted=0
            JOIN productportionmaster ppm ON ppm.productid=pm.productid AND ppm.isdeleted=0
            WHERE mpd.productid=? AND mpd.isdeleted=0 GROUP BY mpd.productportionid;`, [id]);

            if (!getProdFromMenu?.length) {
                throw createError('Please Linked this product with Menu and then add product for Online sell', 400);
            }

            for (let i = 0; i < getProdFromMenu.length; i++) {
                for (let j = 0; j < newLocationChannels.length; j++) {
                    const { locationId, channelId } = newLocationChannels[j];

                    // Fetch only the specific (locationId, channelId) pair
                    const resp = await db.getResults(
                        `SELECT sm.menuid, sm.channelid, sm.locationid
                     FROM storemaster sm
                     WHERE sm.locationid = ? AND sm.channelid = ? AND sm.isdeleted=0`,
                        [locationId, channelId]
                    );

                    if (!resp.length) {
                        winston.error(`No matching menu found for locationId: ${locationId}, channelId: ${channelId}`);
                        continue; // Skip if no match is found
                    }

                    const onlineMenuProdObj = {
                        companyId: data.companyId,
                        isRecommend: getProdFromMenu[i].recomendedproduct,
                        locationId: resp[0].locationid,
                        menuId: resp[0].menuid,
                        channelId: resp[0].channelid,
                        onlinePrice: getProdFromMenu[i].price,
                        productId: getProdFromMenu[i].productid,
                        productPortionId: getProdFromMenu[i].productportionid,
                        menuProductId: getProdFromMenu[i].menuproductid,
                        userId,
                        ip
                    }

                    const menuProductId = await module.exports.onlineAddUpdMenuProdDetails(onlineMenuProdObj);

                    if (!menuProductId) {
                        throw createError('Failed to update product', 400)
                    }
                }
            }
            db.commit();
            return { status: 200, success: 1, msg: 'Menu Updated Successfully' };

        } catch (error) {
            await db.rollback();
            winston.error(error);
            return { status: error.statusCode || 500, success: 0, msg: error.message }

        }
    },

    delete: async (data, userId, ip) => {
        try {
            await db.getResults(`UPDATE productmaster pm SET pm.isdeleted=1, pm.modifiedby=${userId}, pm.modifieddate='${moment().format("YYYY-MM-DD HH:mm:ss")}', pm.productimg=null, pm.onlineimg=null, pm.ipaddress='${ip}' WHERE pm.productid IN(${data.productId});`);

            await db.getResults(`UPDATE menuproductdetails mpd SET mpd.isdeleted=1, mpd.modifiedby=${userId}, mpd.modifieddate='${moment().format("YYYY-MM-DD HH:mm:ss")}', mpd.ipaddress='${ip}' WHERE mpd.productid IN(${data.productId}); `);
      
            await db.getResults(`UPDATE producttagmapping SET isdeleted = 1 WHERE productid IN (${data.productId});`);
    
            return { status: 200, success: 1, msg: 'Product Deleted Successfully' };
        } catch (error) {
            return { status: 500, success: 0, msg: error.message };
        }
    },

    getProductFromCategory: async (productcategoryid) => {
        let sql = `SELECT prm.productid, prm.productname FROM productmaster AS prm JOIN productcategorymaster AS pcm ON prm.productcategoryid = pcm.productcategoryid AND pcm.isdeleted = 0 WHERE prm.isdeleted=0 AND prm.productcategoryid IN (?) LIMIT 10`;
        let resp = await db.getResults(sql, [productcategoryid]);
        return resp;
    },
}