const db = require('../config/db');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const { MD5 } = require('crypto-js');
const moment = require("moment");
const { getAllUsers } = require('../controllers/user.controller');
const JWT_SECRET = process.env.JWT_SECRET;
const date = moment();

module.exports = {
    getAllUsers: async () => {
        try {
            // Fetch userid and password
            let res = await db.getResults(`select um."UserID",um."FirstName" ,um."LastName" ,um."UserName" ,um."Email" ,um."Gender" ,um."MinistryDepartmentID" ,mdm."MinistryDepartmentName",um."DepartmentID" ,dm."DepartmentName",um."ProjectUnitID" ,pum."ProjectUnitName",um."DesignationID" ,dm2."DesignationName"  from "UserMaster" um 
                                        join "MinistryDepartmentMaster" mdm on mdm."MinistryDepartmentID" = um."MinistryDepartmentID" 
                                        join "ProjectUnitMaster" pum on pum."ProjectUnitID" = um."ProjectUnitID" 
                                        join "DepartmentMaster" dm on dm."DepartmentID" = um."DepartmentID" 
                                        join "DesignationMaster" dm2 on dm2."DesignationID" = um."DesignationID"  
                                        WHERE um."IsDeleted" = false`);

            if (!res?.length) return { success: 0, msg: "No User found" };

            const usersList = res;

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

}