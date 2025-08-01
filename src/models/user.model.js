const db = require('../config/db');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const { MD5 } = require('crypto-js');
const moment = require("moment");
const { getAllUsers } = require('../controllers/user.controller');
const JWT_SECRET = process.env.JWT_SECRET;
const date = moment();

module.exports = {
    getAllUsers: async () =>{
         try {
        // Query to get all users with role information
        const query = `
            SELECT 
                u.userid,
                u.firstname,
                u.lastname,
                u.email,
                u.roleid,
                r.rolename,
                u.designation,
                u.phoneno,
                u.profileimg,
                u.isactive,
                u.createdby,
                u.createdat,
                u.updatedby,
                u.updatedat
            FROM "usermaster" u
            LEFT JOIN "rolemaster" r ON u.roleid = r.roleid
            WHERE u.isdelete IS NOT TRUE
            ORDER BY u.createdat DESC
        `;

        let res = await db.getResults(query);

        if (!res?.length) return { success: 0, msg: "No users found" };

        // Remove password from all user objects (if it exists)
        const usersList = res.map(user => {
            const { password, ...userWithoutPassword } = user;
            return userWithoutPassword;
        });

        return { success: 1, data: usersList };
    } catch (error) {
        return { success: 0, msg: error.message, error: error.message };
    }
},

    userRegister: async (body, info) => {
        try {
            // Fetch userid and password

            let getEmail = await db.getResults(`select * from "usermaster" where "email" = '${body.email}'`);
            if (getEmail?.length) return { success: 409, msg: "Email already exists" };
            const client = await db.pool.connect();
            await db.beginTransaction(client);

            const userData = {
                "firstname": body.firstName,
                "lastname": body.lastName,
                "email": body.email,
                "password": body.password,
                "roleid":body.roleid,
                "designation": body.designation,
                "phoneno":body.phoneno,
                "isactive":body.isactive,
                "createdby": 0,
                "createdat": new Date()
            };

            const userInsertQuery = `
                                    INSERT INTO "usermaster" ("${Object.keys(userData).join('","')}")
                                    VALUES (${Object.keys(userData).map((_, i) => `$${i + 1}`).join(", ")})
                                    RETURNING "userid"
                                    `;
            const userResult = await client.query(userInsertQuery, Object.values(userData));
            const userId = userResult.rows[0].UserID;

            await db.commit(client);

            return { success: 1, data: userId };
        } catch (error) {
            return { success: 0, msg: error.message, error: error.message };
        }
    },

    updateUser: async (body, info) => {
    try {
        // Check if user exists
        let checkUser = await db.getResults(`SELECT * FROM "usermaster" WHERE "userid" = $1 AND "isdelete" IS NOT TRUE`, [body.userid]);
        if (!checkUser?.length) return { success: 0, msg: "User not found", statusCode: 404 };

        // Check if email already exists for different user
        let getEmail = await db.getResults(`SELECT * FROM "usermaster" WHERE "email" = $1 AND "userid" != $2`, [body.email, body.userid]);
        if (getEmail?.length) return { success: 0, msg: "Email already exists", statusCode: 409 };

        const client = await db.pool.connect();
        await db.beginTransaction(client);

        try {
            // Prepare update data
            const updateData = {
                "firstname": body.firstName,
                "lastname": body.lastName,
                "email": body.email,
                "roleid": body.roleid,
                "designation": body.designation,
                "phoneno": body.phoneno,
                "isactive": body.isactive,
                "updatedby": info?.userId || 0, // Get from JWT token info
                "updatedat": new Date()
            };

            // Add password to update data if provided
            if (body.password) {
                updateData.password = body.password;
            }

            // Build dynamic update query
            const updateFields = Object.keys(updateData).map((key, index) => `"${key}" = $${index + 1}`).join(', ');
            const updateValues = Object.values(updateData);
            updateValues.push(body.userid); // Add userid for WHERE clause

            const updateQuery = `
                UPDATE "usermaster" 
                SET ${updateFields}
                WHERE "userid" = $${updateValues.length}
                RETURNING "userid"
            `;

            const updateResult = await client.query(updateQuery, updateValues);
            
            if (!updateResult.rows.length) {
                await db.rollback(client);
                return { success: 0, msg: "Failed to update user", statusCode: 500 };
            }

            await db.commit(client);

            return { success: 1, data: updateResult.rows[0].userid };

        } catch (error) {
            await db.rollback(client);
            throw error;
        }

    } catch (error) {
        return { success: 0, msg: error.message, error: error.message };
    }
},

deleteUserById: async (userid, info) => {
  try {
    const result = await db.getResults(
      `UPDATE usermaster
       SET isdelete = true, updatedby = $1, updatedat = NOW()
       WHERE userid = $2
       RETURNING userid;`,
      [info.userid, userid]
    );

    if (result.length === 0) {
      return { success: 0, msg: "User not found or already deleted" };
    }

    return { success: 1, data: result[0] };
  } catch (error) {
    return { success: 0, msg: error.message };
  }
}



}