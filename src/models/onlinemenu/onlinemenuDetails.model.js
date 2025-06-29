const db = require("../../config/db.js");
const moment = require("moment");
const winston = require("../../config/winston.js");


module.exports = {

    getOnlineMenuDetailsList: async (req) => {
        const { draw, start, length, search, sortField, sortOrder } = req.query;

        let sql = `SELECT CASE WHEN omd.channelid IS NOT NULL AND omd.channelid > 0 THEN 1 ELSE 0 END AS isonline, IFNULL(omd.channelid, 0) channelid, mpd.menuproductid, omd.sortnumber, pcm.productcategoryname, pm.productname, p.portionname, IFNULL(omd.price,mpd.zomatoprice) price, mpd.taxprofileid, IFNULL(omd.stockinout, 0) stockinout, IFNULL(omd.isrecommended, 0) isrecommended, cb.username AS createdby, DATE_FORMAT(mpd.createddate, '%d-%m-%Y %r') AS createddate, IFNULL(mb.username, '') AS modifiedby, IFNULL(DATE_FORMAT(omd.modifieddate, '%d-%m-%Y %r'), '') AS modifieddate FROM menuproductdetails mpd 
        LEFT JOIN onlinemenudetails omd ON omd.menuproductid = mpd.menuproductid AND omd.isdeleted = 0 AND omd.channelid = ? AND omd.locationid = ?
        JOIN productcategorymaster pcm ON pcm.productcategoryid = mpd.productcategoryid AND pcm.isdeleted = 0 
        JOIN productmaster pm ON pm.productid = mpd.productid AND pm.isdeleted = 0 
        JOIN portionmaster p ON p.portionid = mpd.portionid AND p.isdeleted = 0 
        JOIN taxprofilemaster tpm ON tpm.taxprofileid = mpd.taxprofileid AND tpm.isdeleted = 0
        JOIN usermaster cb ON cb.userid = mpd.createdby 
        LEFT JOIN usermaster mb ON mb.userid = mpd.modifiedby WHERE mpd.menuid = ? AND mpd.isdeleted = 0`;

        
        const params = [req.body.channelId, req.body.locationId, req.body.menuId];
        // Fetch all data before filtering
        
        if (search && search.trim() !== '') {
            sql += ` AND (LOWER(pm.productname) LIKE LOWER(?) OR LOWER(pcm.productcategoryname) LIKE LOWER(?) OR LOWER(p.portionname) LIKE LOWER(?))`;
            
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }
        
        const allData = await db.getResults(sql, params);
        // Sorting logic
        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY omd.sortnumber DESC`;  // Default sorting by sortnumber
        }

        // Apply pagination
        if (length != -1) {
            sql += ` LIMIT ?, ?`;
            params.push(parseInt(start), parseInt(length));
        }

        let filteredData = await db.getResults(sql, params);

        let existingNumbers = filteredData
            .map(srno => srno.sortnumber)
            .filter(num => num !== null)
            .sort((a, b) => a - b);

        let counter = 1;

        // Adjust sortnumber if it's null
        filteredData = filteredData.map((srno) => {
            if (srno.sortnumber === null) {
                while (existingNumbers.includes(counter)) {
                    counter++;
                }
                srno.sortnumber = counter++;
            }
            return srno;
        });

        return {
            "totalFiltered": filteredData.length,
            "totalRecords": allData.length,
            "data": filteredData,
        };
    },

    updateOnlineMenuDetailsList: async (value, userId, ip) => {
        try {
            await db.beginTransaction();

            let products = value.products.map(p => p.menuProductId);

            // Fetch all existing online menu products in one query
            let duplicateOnlineProductQuery = `
                SELECT menuproductid, onlinemenuid
                FROM onlinemenudetails
                WHERE menuproductid IN (?) AND channelid = ? AND isdeleted = 0
            `;
            let existingOnlineProducts = await db.getResults(duplicateOnlineProductQuery, [products, value.channelId]);
            console.log("existingOnlineProducts:", existingOnlineProducts);

            // Map menuproductid to the entire row (including onlinemenuid)
            let existingProductsMap = new Map(
                existingOnlineProducts.map(p => [p.menuproductid, p]) // Map menuproductid to the full object
            );

            // Fetch all menu product details in one query
            let menuProductDetailsQuery = `
                SELECT menuproductid, menuid, locationid, companyid, productid, productportionid
                FROM menuproductdetails
                WHERE menuproductid IN (?) AND isdeleted = 0
            `;
            let menuDetailsList = await db.getResults(menuProductDetailsQuery, [products]);
            let menuDetailsMap = new Map(
                menuDetailsList.map(detail => [detail.menuproductid, detail])
            );
        

            for (let product of value.products) {
                let menuDetails = menuDetailsMap.get(product.menuProductId);

                if (!menuDetails) {
                    await db.rollback();
                    throw new Error(`Product not Found in Menu.`);
                }

                if (existingProductsMap.has(product.menuProductId)) {
                    // Update existing product
                    let existingProduct = existingProductsMap.get(product.menuProductId); // Get the full object
                    let updateObj = {
                        price: product.price,
                        isdeleted: product.isChecked ? 0 : 1,
                        sortnumber: product.sortNumber,
                        taxprofileid: product.tax,
                        stockinout: product.stockInOut,
                        isrecommended: product.isRecommended,
                        modifiedby: userId,
                        modifieddate: moment().format("YYYY-MM-DD H:m:s"),
                        onlineMenuId: existingProduct.onlinemenuid // Use onlinemenuid from the mapped object
                    };

                    let updateQuery = `
                        UPDATE onlinemenudetails omd
                        JOIN menuproductdetails mpd ON omd.menuproductid = mpd.menuproductid
                        SET omd.price = ?, 
                            omd.isdeleted = ?,
                            omd.sortnumber = ?,
                            mpd.taxprofileid = ?,
                            omd.stockinout = ?, 
                            omd.isrecommended = ?, 
                            omd.modifiedby = ?, 
                            omd.modifieddate = ?
                        WHERE omd.onlinemenuid = ? AND omd.isdeleted = 0`;

                    await db.getResults(updateQuery, Object.values(updateObj))

                } else if (product.isChecked) {
                    // Insert new product if isChecked is 1
                    let onlineMenudetailsObj = {
                        menuproductid: product.menuProductId,
                        menuid: menuDetails.menuid,
                        locationid: menuDetails.locationid,
                        productid: menuDetails.productid,
                        productportionid: menuDetails.productportionid,
                        price: product.price,
                        companyid: menuDetails.companyid,
                        channelid: value.channelId,
                        sortnumber: product.sortNumber,
                        isrecommended: product.isRecommended || 0,
                        stockinout: product.stockInOut || 0,
                        createdby: userId,
                        createddate: moment().format("YYYY-MM-DD H:m:s"),
                        ipaddress: ip,
                    };

                    await db.insert("onlinemenudetails", onlineMenudetailsObj);
                }
            }

            await db.commit();
            return { status: 201, success: 1, msg: "Online Menu Updated Successfully" }
        } catch (error) {
            await db.rollback();
            winston.error(error);
            return { status: 500, success: 0, msg: "Internal Server Error" };
        }
    },
}
