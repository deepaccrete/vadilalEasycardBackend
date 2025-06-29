const db = require("../../config/db");
const moment = require("moment");
const generateStoreQuery = (channelId) => {
    let sql = `SELECT s.channelid, s.storeid, s.storename, s.address, s.contactnum,
        IFNULL(s.notificationcontact, "") AS notificationcontact,
        IFNULL(s.email, "") AS email, s.pincode, s.storedaytimejson,
        s.activestore,      
        l.locationid, l.locationname,
        IFNULL(p.posid, 0) AS posid,
        IFNULL(p.posname, "") AS posname`;

    if (channelId == 1) {
        sql += `,
            IFNULL(m.menuid, 0) AS menuid,
            IFNULL(m.menuname, "") AS menuname,
             IFNULL(s.hideui, 0) AS hideui,
             IFNULL(s.enablepaylater, 0) AS enablepaylater,
            s.onlineordering,
             IFNULL(c.cityid, 0) AS cityid,
            IFNULL(c.cityname, "") AS cityname,
            s.ispickup, IFNULL(pickupminval, "") AS pickupminval,
            s.isotprequired, 
            s.ishomedelivery, 
            IFNULL(homedeliveryminval, "") AS homedeliveryminval,
            IFNULL(cfsm.pgid, "") pgid,
            IFNULL(cfsm.appid, "") appid,
            IFNULL(cfsm.secretkey, "") secretkey,
            json_arrayagg(ascrm.chargeid) as charge_ids `;
    } else if (channelId == 2) {
        sql += `,
            IFNULL(s.hideui, 0) AS hideui,
            IFNULL(c.cityid, 0) AS cityid,
            IFNULL(c.cityname, "") AS cityname,
            IFNULL(m.menuid, 0) AS menuid,
            IFNULL(m.menuname, "") AS menuname,
            IFNULL(sp.platformid, 0) AS platformid,
            s.onlineordering,
            IFNULL(sp.isactive, 0) AS isactive,
            JSON_ARRAYAGG(JSON_OBJECT('platformId', sp.platformid ,'platformName', pltfm.platformname ,'isActive', sp.isactive)) as platform_data`;
    } else {
        sql += `,IFNULL(c.cityid, 0) AS cityid,
            IFNULL(c.cityname, "") AS cityname`;
    }
    sql += ` FROM storemaster s
        JOIN locationmaster l ON l.locationid = s.locationid AND l.isdeleted = 0
        LEFT JOIN posmaster p ON p.posid = s.posid AND p.isdeleted = 0 `;

    if (channelId == 1) {
        sql += `
            JOIN menumaster m ON m.menuid = s.menuid AND m.isdeleted = 0
            JOIN citymaster c ON c.cityid = s.cityid AND c.isdeleted = 0
            LEFT JOIN cashfreestoremapping cfsm ON cfsm.storeid = s.storeid AND cfsm.isdeleted = 0
            LEFT JOIN accretestorechargemap ascrm ON ascrm.storeid = s.storeid AND ascrm.isdeleted = 0
            LEFT JOIN chargemaster cm ON cm.chargeid = ascrm.chargeid AND cm.isdeleted = 0`;
    } else if (channelId == 2) {
        sql += `
            JOIN citymaster c ON c.cityid = s.cityid AND c.isdeleted = 0
            JOIN menumaster m ON m.menuid = s.menuid AND m.isdeleted = 0
            LEFT JOIN storeplatform sp ON sp.storeid = s.storeid AND sp.isdeleted = 0
            LEFT JOIN platformmaster pltfm ON pltfm.platformid = sp.platformid AND pltfm.isdeleted = 0`;
    } else {
        sql += `
            JOIN citymaster c ON c.cityid = s.cityid AND c.isdeleted = 0`;
    }
    return sql;
};
module.exports = {

    getPosAndMenuList: async (locationId) => {
        let sql = ` select
	JSON_ARRAYAGG(JSON_OBJECT('posid', p.posid, 'posname', p.posname ,'menuid' , p.defaultmenuid , 'menuname', m.menuname  )) as pos_data ,
	p.locationid ,
	l.cityid ,
	l.locationname,
	c.cityid,
	c.cityname,
	l.emailid,
	IFNULL(l.address, "") as address,
	IFNULL(l.contactno, "") as contactno
from
	posmaster p
join locationmaster l on
	l.locationid = p.locationid
	and l.isdeleted = 0
join citymaster c on
	c.cityid = l.cityid
	and c.isdeleted = 0
join menumaster m  on m.menuid = p.defaultmenuid  and m.isdeleted  = 0 
where
	p.locationid = ?
	and p.isdeleted = 0`
        let params = [locationId];
        const data = await db.getResults(sql, params);
        return data;
    },
    list: async (req) => {
        const { search, start, length, sortField, sortOrder } = req.query;
        const { companyId } = req.body;
        let sql = `select s.storeid, s.storename ,cm.channelname ,l.locationname ,IFNULL(c.cityname, "") AS cityname , s.activestore , IFNULL(p.posname, "") AS posname, DATE_FORMAT(s.createddate, '%d-%m-%Y %r') AS createddate , u.username as createdby, IFNULL(DATE_FORMAT(s.modifieddate, '%d-%m-%Y %r'), '') AS 
        modifieddate ,  IFNULL(u.username, '') AS modifiedby from storemaster s
        join citymaster c on s.cityid = c.cityid and c.isdeleted= 0 
        join locationmaster l on s.locationid = l.locationid and l.isdeleted = 0
        left join posmaster p on s.posid = p.posid and p.isdeleted = 0
        join usermaster u on s.createdby = u.userid and u.isdeleted = 0
        join channelmaster cm on s.channelid = cm.channelid and cm.isdeleted = 0
        where s.isdeleted = 0 and s.companyid = ?`;
        let params = [companyId];
        if (search && search.trim() !== "") {
            sql += ` AND (LOWER(s.storename) LIKE LOWER(?) OR LOWER(l.locationname) LIKE LOWER(?) OR LOWER(c.cityname) LIKE LOWER(?) OR LOWER(p.posname) LIKE LOWER(?))`;
            params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
        }
        const allData = await db.getResults(sql, params);
        if (sortField && sortOrder) {
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
        } else {
            sql += ` ORDER BY s.storeid DESC`;
        }
        if (length != -1 && length) {
            sql += ` LIMIT ?, ?`;
            params.push(parseInt(start), parseInt(length));
        }

        const data = await db.getResults(sql, params);
        return {
            totalFiltered: data.length,
            totalRecords: allData.length,
            data: data,
        };
    },
    getStoreData: async (id) => {
        let channelId = `select channelid from storemaster where storeid = ? AND isdeleted = 0`;
        let params = [id];
        const channel = await db.getResults(channelId, params);
        let sql = generateStoreQuery(channel[0].channelid);
        sql += ` WHERE s.isdeleted = 0 AND s.storeid = ?`;
        const data = await db.getResults(sql, params);
        if (!data.length) return { success: 0, msg: "No Data Found", };
        const store = {
            channelId: data[0].channelid,
            storeId: data[0].storeid,
            storeName: data[0].storename,
            locationId: data[0].locationid,
            locationName: data[0].locationname,
            cityId: data[0].cityid,
            cityName: data[0].cityname,
            menuId: data[0].menuid,
            menuName: data[0].menuname,
            posId: data[0].posid,
            posName: data[0].posname,
            address: data[0].address,
            contactNumber: data[0].contactnum,
            notificationContact: data[0].notificationcontact,
            email: data[0].email,
            pinCode: data[0].pincode,
            storeDayTimeJson: data[0].storedaytimejson,
            activeStore: data[0].activestore,
            hideui: data[0].hideui,
            onlineOrdering: data[0].onlineordering,
            enablePayLater: data[0].enablepaylater,
            isOtpRequired: data[0].isotprequired,
            isHomeDelivery: data[0].ishomedelivery,
            homeDeliveryMinVal: data[0].homedeliveryminval,
            isPickup: data[0].ispickup,
            pickupMinVal: data[0].pickupminval,
            pgId: data[0]?.pgid,
            appId: data[0]?.appid,
            secretKey: data[0]?.secretkey,
            chargeId: data[0]?.charge_ids,
            platformData: data[0].platform_data,

        };
        return store;
    },
    getData: async (id, companyId, storename, findDuplicate, channelId, locationId) => {
        let sql = `select  st.storename , cm.cityname, lm.locationname, st.activestore from storemaster st join citymaster cm on st.cityid = cm.cityid AND cm.isdeleted = 0 join locationmaster lm on st.locationid = lm.locationid AND lm.isdeleted = 0 AND st.isdeleted=0`;
        const params = [];
        if (id && id > 0) {
            if (findDuplicate) {
                sql += ` AND st.storeid != ?`;
                params.push(id);
            } else {
                sql += ` AND st.storeid = ? AND st.locationid != ?`;
                params.push(id, locationId);
            }
        }
        if (storename) {
            sql += ` AND LOWER(st.storename) = LOWER(?)`;
            params.push(storename);
        }
        if (companyId && companyId > 0) {
            sql += ` AND st.companyid = ?`;
            params.push(companyId);
        }
        if (channelId && channelId > 0) {
            sql += ` AND st.channelid = ?`;
            params.push(channelId);
        }
        if (locationId && locationId > 0) {
            sql += ` AND st.locationid = ?`;
            params.push(locationId);
        }

        const data = await db.getResults(sql, params);
        return data;
    },
    addStore: async (data) => {
        const { storeData, platformId, chargeId, paymentGateAway, pgid, appid, secretkey } = data;
        const menuIdResp = await db.getResults(`select defaultmenuid from posmaster where posid = ? AND isdeleted = 0`, [storeData.posId]);

        if (storeData.menuId != menuIdResp[0].defaultmenuid) {
            throw new Error("Menu Id is not matching with the default menu id");
        }
        const resp = await db.insert("storemaster", storeData);
        if (storeData.channelId == 1 && chargeId && chargeId.length > 0) {

            for (const chargeid of chargeId) {
                const accretedStoreChargeData = {
                    chargeid: chargeid,
                    storeid: resp.insertId,
                    createdby: storeData.createdBy,
                    createddate: storeData.createdDate,
                    ipaddress: storeData.ipaddress,
                    companyid: storeData.companyId,
                    isdeleted: 0,
                };
                await db.insert("accretestorechargemap", accretedStoreChargeData);
            }
        }
        if (paymentGateAway == 1 && storeData.channelId === 1) {
            const cashfreeStoreData = {
                storeid: resp.insertId,
                locationid: storeData.locationId,
                companyid: storeData.companyId,
                pgid: pgid,
                appid: appid,
                secretkey: secretkey,
                createdby: storeData.createdBy,
                createddate: storeData.createdDate,
                ipaddress: storeData.ipaddress,
                isdeleted: 0,
            };
            await db.insert("cashfreestoremapping", cashfreeStoreData);
        }
        if (storeData.channelId == 2 && platformId && platformId.length > 0) {
            for (const platform of platformId) {
                const platformData = {
                    storeid: resp.insertId,
                    platformid: platform.id,
                    createdby: storeData.createdBy,
                    createddate: storeData.createdDate,
                    ipaddress: storeData.ipaddress,
                    isactive: platform.isActive,
                    companyid: storeData.companyId,
                    isdeleted: 0,
                };
                await db.insert("storeplatform", platformData);
            }
        }
        if (!resp.insertId)
            return { status: 500, success: 0, msg: "Failed to Insert. Please try Again", };
        return { status: 201, success: 1, msg: "Store created successfully." };
    },
    updateStore: async (data, storeId) => {
        const { storeData, platformId, chargeId, paymentGateAway, pgid, appid, secretkey } = data;

        let sql = `UPDATE storemaster SET ? WHERE storeid = ? AND isdeleted = 0`;
        const resp = await db.getResults(sql, [storeData, storeId]);
        if (storeData.channelId == 1 && chargeId && chargeId.length > 0) {
            const deleteData = {
                isdeleted: 1,
                modifiedby: storeData.modifiedBy,
                modifieddate: storeData.modifiedDate,
                ipaddress: storeData.ipaddress,
            };
            await db.getResults(
                `UPDATE accretestorechargemap 
                     SET ? 
                     WHERE chargeid NOT IN (${chargeId.map(() => '?').join(',')}) 
                     AND storeid = ? 
                     AND isdeleted = 0`,
                [deleteData, ...chargeId, storeId]
            );
            // Get existing charge mappings
            const existingCharges = await db.getResults(
                `SELECT chargeid 
                     FROM accretestorechargemap 
                     WHERE chargeid IN (${chargeId.map(() => '?').join(',')}) 
                     AND storeid = ? 
                     AND isdeleted = 0`,
                [...chargeId, storeId]

            );
            const existingChargeIds = existingCharges.map(row => row.chargeid);
            const newChargeIds = chargeId.filter(id => !existingChargeIds.includes(id));
            if (newChargeIds.length > 0) {
                //  inser             t values
                const values = newChargeIds.map(charge => [
                    charge,
                    storeId,
                    0,
                    storeData.modifiedBy,
                    storeData.modifiedDate,
                    storeData.ipaddress,
                    storeData.companyId
                ]);
                //  insert new charges
                const insertSql = `INSERT INTO accretestorechargemap (chargeid, storeid, isdeleted, createdby, createddate, ipaddress, companyid) VALUES ?`;
                const insertResp = await db.getResults(insertSql, [values]);
                if (!insertResp.affectedRows) {
                    throw new Error('Failed to insert store charges');
                }
            }
            if (paymentGateAway == 1) {
                const existingCashfreeStore = await db.getResults(`select storeid from cashfreestoremapping where storeid = ? AND isdeleted = 0`, [storeId]);
                if (existingCashfreeStore.length > 0) {
                    const cashfreeStoreData = {
                        pgid: pgid,
                        appid: appid,
                        secretkey: secretkey,
                        modifiedby: storeData.modifiedBy,
                        modifieddate: storeData.modifiedDate,
                        ipaddress: storeData.ipaddress,
                        isdeleted: 0,
                    };
                    let sql = `update cashfreestoremapping set ? where storeid = ? and isdeleted = 0`;
                    const resp = await db.getResults(sql, [cashfreeStoreData, storeId]);
                    if (!resp.affectedRows)
                        return { status: 500, success: 0, msg: "Failed to Update cashfree store . Please try Again", };
                } else {
                    const cashfreeStoreData = {
                        storeid: storeId,
                        locationid: storeData.locationId,
                        companyid: storeData.companyId,
                        pgid: pgid,
                        appid: appid,
                        secretkey: secretkey,
                        createdby: storeData.modifiedBy,
                        createddate: storeData.modifiedDate,
                        ipaddress: storeData.ipaddress,
                        isdeleted: 0,
                    };
                    await db.insert("cashfreestoremapping", cashfreeStoreData);
                    if (!resp.insertId) return { status: 500, success: 0, msg: "Failed to Insert cashfree store . Please try Again", };
                }
            }
            if (paymentGateAway == 0) {
                const deleteData = {
                    isdeleted: 1,
                    modifiedby: storeData.modifiedBy,
                    modifieddate: storeData.modifiedDate,
                    ipaddress: storeData.ipaddress,
                };
                let deleteSql = `UPDATE cashfreestoremapping SET ? WHERE storeid = ?`;
                await db.getResults(deleteSql, [deleteData, storeId]);
            }
        }
        if (storeData.channelId == 2 && platformId) {
            const platformIds = platformId.map(p => p.id);
            const existingPlatforms = await db.getResults(
                `SELECT platformid 
                FROM storeplatform 
                WHERE platformid IN (${platformIds.map(() => '?').join(',')}) 
                AND storeid = ? 
                AND isdeleted = 0`,
                [...platformIds, storeId]
            );
            const existingPlatformIds = existingPlatforms.map(row => row.platformid);
            const newPlatformIds = platformIds.filter(id => !existingPlatformIds.includes(id));

            if (newPlatformIds.length > 0) {
                const values = newPlatformIds.map(platform => [
                    storeId,
                    platform,
                    1,
                    storeData.modifiedBy,
                    storeData.modifiedDate,
                    storeData.ipaddress,
                    storeData.companyId,
                    0
                ]);
                const insertSql = `INSERT INTO storeplatform (storeid, platformid, isactive, createdby, createddate, ipaddress, companyid, isdeleted) VALUES ?`;
                const insertResp = await db.getResults(insertSql, [values]);
                if (!insertResp.affectedRows)
                    return { status: 500, success: 0, msg: "Failed to Insert platform . Please try Again", };
            }
            for (const platform of platformId) {
                const platformData = {
                    isactive: platform.isActive,
                    modifiedby: storeData.modifiedBy,
                    modifieddate: storeData.modifiedDate,
                    ipaddress: storeData.ipaddress,
                };
                let sql = `update storeplatform set ? where storeid = ? and platformid = ? and isdeleted = 0`;
                const resp = await db.getResults(sql, [platformData, storeId, platform.id]);
                if (!resp.affectedRows)
                    return { status: 500, success: 0, msg: "Failed to Update platform . Please try Again", };
            }
        }
        if (!resp.affectedRows)
            return { status: 500, success: 0, msg: "Failed to Update. Please try Again", };
        return { status: 200, success: 1, msg: "Store updated successfully." };
    },
    deleteStore: async (data, storeId) => {
        let sql = `UPDATE storemaster SET ? WHERE storeid IN (?)`;
        let sql2 = `UPDATE accretestorechargemap SET ? WHERE storeid IN (?)`;
        let sql3 = `UPDATE cashfreestoremapping SET ? WHERE storeid IN (?)`;

        const resp = await db.getResults(sql, [data, storeId]);
        const resp2 = await db.getResults(sql2, [data, storeId]);
        const resp3 = await db.getResults(sql3, [data, storeId]);
        if (!resp.affectedRows)
            return { status: 500, success: 0, msg: "Failed to Delete. Please try Again", };
        return { status: 200, success: 1, msg: "Store deleted successfully." };
    },
};
