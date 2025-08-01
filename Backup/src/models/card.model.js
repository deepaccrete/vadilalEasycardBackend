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
                "GSTIN": gstin,
                "Country": country,
                "State": state,
                "City": city,
                "Pincode": pincode
            } = json;

            const companyPhone1 = phoneNumbers[0] || null;
            const companyPhone2 = phoneNumbers[1] || null;
            const companyAddress = address || null;

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
        updatedat = NOW(),
        country = $14,
        state = $15,
        city = $16,
        pincode = $17
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
                cardid,
                country,
                state,
                city,
                pincode
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
          console.log("this is the error --- ",error);
          
            return { success: 0, msg: error.message, error: error.message };
        }
    },

    getcardlists: async (info) => {
        try {
            let cardRows = await db.getResults(`
                                                 SELECT cardid,companyname, companydetails, companyemail, compnaywebsite,comapanyphoneno1, comapanyphoneno2, companyaddress, companygstin,cardfrontimgurl,cardbackimgurl,createdby,createdat,extractedjson,country,city,state,pincode,fax 
                                                  FROM cardmaster
                                                  WHERE isdelete = false
                                                            `);

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
                "Country":card.country,
                "State":card.state,
                "City":card.city,
                "Pincode":card.pincode,
                "Fax":card.fax,
                "Company  Email": card.companyemail,
                "Web Address": card.compnaywebsite,
                "Company's Work Details": card.companydetails,
                "GSTIN": card.companygstin,
                "Is Base64" : 1,
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
    },

    getcardlistsbyid: async (id) => {
        try {
            let cardRows = await db.getResults(`
                                                 SELECT cardid,companyname, companydetails, companyemail, compnaywebsite,comapanyphoneno1, comapanyphoneno2, companyaddress, companygstin,cardfrontimgurl,cardbackimgurl,createdby,createdat,extractedjson 
                                                  FROM cardmaster
                                                  WHERE isdelete = false and cardid = '${id}'
                                                            `);

            if (cardRows.length === 0) {
                return { success: 0, msg: "list not found" }
                return res.status(404).json({ error: 'Card not found' });
            }

            // Fetch person details
            let persons = await db.getResults(`
                                                        SELECT cardid, fullname, phone1, email, designation
                                                        FROM cardpersonsdetails
                                                        WHERE isdelete = false and cardid = '${id}'
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
                "Is Base64" : 1,
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
    },

    insertCardWithDetails: async (json, base64Images, info) => {
  const client = await db.pool.connect();
  try {
    await db.beginTransaction(client);

    // Insert into cardmaster
    const result = await client.query(
      `INSERT INTO cardmaster (
        groupid, tagid, companyname, companyemail, compnaywebsite,
        comapanyphoneno1, companyaddress, cardfrontimgurl, cardbackimgurl,
        createdby, createdat
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW()) RETURNING cardid;`,
      [
        json["Group ID"],
        json["Tag ID"],
        json["Company Name"],
        json["Company  Email"],
        json["Web Address"],
        json["Company Phone Number"],
        json["Company Address"],
        base64Images[0] || null,
        base64Images[1] || null,
        info.userid
      ]
    );

    const cardid = result.rows[0].cardid;

    // Insert person details
    for (const person of json["Person details"]) {
      await client.query(
        `INSERT INTO cardpersonsdetails (
          cardid, fullname, phone1, email, designation, createdby, createdat
        ) VALUES ($1,$2,$3,$4,$5,$6,NOW());`,
        [
          cardid,
          person.Name,
          person["Phone Number"],
          person.Email || null,
          person.Position || null,
          info.userid
        ]
      );
    }

    await db.commit(client);
    return { success: 1, data: { cardid } };
  } catch (error) {
    await db.rollback(client);
    return { success: 0, msg: error.message };
  } finally {
    client.release();
  }
},

updateCardWithDetails: async (cardid, json, info) => {
  const client = await db.pool.connect();
  try {
    await db.beginTransaction(client);

    // ✅ 1. Update cardmaster (no images)
    const cardRes = await client.query(
      `UPDATE cardmaster SET
        groupid = $1,
        tagid = $2,
        companyname = $3,
        companyemail = $4,
        compnaywebsite = $5,
        comapanyphoneno1 = $6,
        companyaddress = $7,
        updatedby = $8,
        updatedat = NOW()
      WHERE cardid = $9`,
      [
        json["Group ID"],
        json["Tag ID"],
        json["Company Name"],
        json["Company  Email"],
        json["Web Address"],
        json["Company Phone Number"],
        json["Company Address"],
        info.userid,
        cardid
      ]
    );

    if (cardRes.rowCount === 0) {
      throw new Error(`Sorry can't find card with ID: ${cardid}`);
    }

    // ✅ 2. Upsert persons
    const incomingPersonIds = [];

    for (const person of json["Person details"]) {
        console.log("-----------------------",person);
        
      if (person.cardpersonsid) {
        // Try to update existing
        const updatePerson = await client.query(
          `UPDATE cardpersonsdetails SET
            fullname = $1,
            phone1 = $2,
            phone2 = $3,
            email = $4,
            designation = $5,
            updatedby = $6,
            updatedat = NOW(),
            isdelete = false
          WHERE cardpersonsid = $7 AND cardid = $8`,
          [
            person.Name,
            person["Phone Number"],
            null, // phone2 if you have it
            person.Email || null,
            person.Position || null,
            info.userid,
            person.cardpersonsid,
            cardid
          ]
        );

        if (updatePerson.rowCount === 0) {
          throw new Error(`Person ID ${person.cardpersonsid} not found for Card ID ${cardid}`);
        }

        incomingPersonIds.push(person.cardpersonsid);
      } else {
        // Insert new
        const insertPerson = await client.query(
          `INSERT INTO cardpersonsdetails (
            cardid, fullname, phone1, phone2, email, designation,
            createdby, createdat, isdelete
          ) VALUES ($1,$2,$3,$4,$5,$6,$7,NOW(),false)
          RETURNING cardpersonsid;`,
          [
            cardid,
            person.Name,
            person["Phone Number"],
            null, // phone2 if you have it
            person.Email || null,
            person.Position || null,
            info.userid
          ]
        );

        incomingPersonIds.push(insertPerson.rows[0].cardpersonsid);
      }
    }
    console.log("-------- this is the list --- ",incomingPersonIds);
    
    // ✅ 3. Soft delete stale rows
    if (incomingPersonIds.length > 0) {
      await client.query(
        `UPDATE cardpersonsdetails
         SET isdelete = true, updatedby = $1, updatedat = NOW()
         WHERE cardid = $2 AND cardpersonsid NOT IN (${incomingPersonIds.join(',')})`,
        [info.userid, cardid]
      );
    } else {
      // Soft delete all if no person details sent
      await client.query(
        `UPDATE cardpersonsdetails
         SET isdelete = true, updatedby = $1, updatedat = NOW()
         WHERE cardid = $2`,
        [info.userid, cardid]
      );
    }

    await db.commit(client);
    return { success: 1, data: { cardid, activePersons: incomingPersonIds } };
  } catch (error) {
    await db.rollback(client);
    return { success: 0, msg: error.message };
  } finally {
    client.release();
  }
},




}
