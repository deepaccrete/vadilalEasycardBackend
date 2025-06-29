const db = require('../config/db');
const moment = require('moment');
const { getgroup } = require('../controllers/group.controller');
const e = require('express');

module.exports = {
    insertcard: async (body, info) => {
        try {
            let getGroup = await db.getResults(`select * from "groupmaster" where "groupname" = '${body.groupname}'`);
            if (getGroup?.length) return { success: 409, msg: "Group already exists" };

            // Fetch userid and password
            let res = await db.getResults(`INSERT INTO groupmaster (groupname, createdby, createdat)
                                         VALUES ($1, $2, $3)
                                        RETURNING *;`, [body.groupname, info.userid, new Date()]);

            if (res.rows.length === 0) {
                return { success: 0, message: "Not inserted" };
            } else {
                return { success: 1, data: res.rows[0] };
            }

            return { success: 1, data: res };
        } catch (error) {
            return { success: 0, msg: error.message, error: error.message };
        }
    },

    insertcardbase65: async (base64Images, info) => {
        let res = await db.getResults(`INSERT INTO cardmaster (cardfrontimgurl,cardbackimgurl, createdby, createdat)
                                         VALUES ($1, $2, $3, $4)
                                        RETURNING *;`, [base64Images[0], base64Images[1], info.userid, new Date()]);
        if (res.length == 0) {
            return { success: 0, message: "Not inserted" };
        } else {
            return { success: 1, data: res[0] };
        }
    },

    insertextracteddata: async (json, cardid, info) => {
        try {
            // console.log("we are in db inset============================",json,cardid,info);
            const {
                "Company Name": companyName,
                "Person details": personDetails,
                "Company Phone Number": phoneNumbers,
                "Company Address": address,
                "Company  Email": email,
                "Web Address": website,
                "Company's Work Details": workDetails,
                "GSTIN": gstin
            } = json;

            const companyPhone1 = phoneNumbers[0] || null;
            const companyPhone2 = phoneNumbers[1] || null;
            const companyAddress = address[0] || null;

            // Start a transaction
            const client = await db.pool.connect();
            await db.beginTransaction(client);

            // Update cardmaster
            await client.query(`
      UPDATE cardmaster SET
        companyname = $1,
        companydetails = $2,
        companyemail = $3,
        compnaywebsite = $4,
        comapanyphoneno1 = $5,
        comapanyphoneno2 = $6,
        companyaddress = $7,
        companygstin = $8,
        ismanualentery = $9,
        extractedjson = $10,
        isprocessed = $11,
        updatedby = $12,
        updatedat = NOW()
      WHERE cardid = $13
    `, [
                companyName,
                workDetails,
                email,
                website,
                companyPhone1,
                companyPhone2,
                companyAddress,
                gstin,
                false, // ismanualentery
                JSON.stringify(json),
                true, // isprocessed
                info.userid,
                cardid
            ]);

            // Insert each person in cardpersonsdetails
            for (const person of personDetails) {
                const { Name: name, "Phone Number": phoneNumber } = person;

                await client.query(`
        INSERT INTO cardpersonsdetails (
          cardid, fullname, email, designation, phone1,createdby, createdat 
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [
                    cardid,
                    name,
                    person.Email || null,
                    person.Position || null,
                    phoneNumber,
                    info.userid,
                ]);
            }

            // Commit transaction
            await db.commit(client);
        } catch (error) {
            return { success: 0, msg: error.message, error: error.message };
        }
    },

    getcardlists: async () => {
        try {
            let cardRows = await db.getResults(`
                                                 SELECT cardid,companyname, companydetails, companyemail, compnaywebsite,comapanyphoneno1, comapanyphoneno2, companyaddress, companygstin,cardfrontimgurl,cardbackimgurl,createdby,createdat,extractedjson 
                                                  FROM cardmaster
                                                  WHERE isdelete = false
                                                            `);

            console.log("dlkjflsdkjlfdlkjfsdlkjdf", cardRows);

            if (cardRows.length === 0) {
                return { success: 0, msg: "list not found" }
                return res.status(404).json({ error: 'Card not found' });
            }

            // Fetch person details
            let persons = await db.getResults(`
                                                        SELECT cardid, fullname, phone1, email, designation
                                                        FROM cardpersonsdetails
                                                        WHERE isdelete = false
                                                        `);

            const personsByCard = persons.reduce((acc, person) => {
                if (!acc[person.cardid]) acc[person.cardid] = [];
                acc[person.cardid].push({
                    "Name": person.fullname,
                    "Phone Number": person.phone1,
                    "Email": person.email,
                    "Position": person.designation
                });
                return acc;
            }, {});
            // Compose JSON
            const jsonResponse = cardRows.map(card => ({
                "Card ID": card.cardid,
                "Company Name": card.companyname,
                "Person details": personsByCard[card.cardid] || [],
                "Company Phone Number": [card.comapanyphoneno1, card.comapanyphoneno2].filter(Boolean).join(', '),
                "Company Address": [card.companyaddress],
                "Company  Email": card.companyemail,
                "Web Address": card.compnaywebsite,
                "Company's Work Details": card.companydetails,
                "GSTIN": card.companygstin,
                "Card Front Image": card.cardfrontimgurl ? card.cardfrontimgurl.toString('base64') : null,
                "Card Back Image": card.cardbackimgurl ? card.cardbackimgurl.toString('base64') : null,
                "Created By": card.createdby,
                "Created At": moment(card.createdat).format('YYYY-MM-DD HH:mm:ss'),
                "Extracted JSON": card.extractedjson
            }));
            return { success: 1, data:jsonResponse };

        } catch (error) {
            return { success: 0, msg: error.message, error: error.message };
        }
    }
}