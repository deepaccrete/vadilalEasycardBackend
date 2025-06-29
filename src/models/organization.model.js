const db = require('../config/db');
const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const { MD5 } = require('crypto-js');
const moment = require("moment");
const { getAllUsers } = require('../controllers/user.controller');
const { getDesignation } = require('../controllers/organization.controller');
const JWT_SECRET = process.env.JWT_SECRET;
const date = moment();

module.exports = {
    getMinistry: async () => {
        try {
            
            let res = await db.getResults(`select mdm."MinistryDepartmentID" ,mdm."MinistryDepartmentName" from "MinistryDepartmentMaster" mdm where mdm."IsDeleted" = false`); 
                                        
            if (!res?.length) return { success: 0, msg: "No Ministry found" };

            return { success: 1, data: res };
        } catch (error) {
            return { success: 0, msg: error.message, error: error.message };
        }
    },
    getProjectUnit: async () => {
        try {
            
            let res = await db.getResults(`select pum."ProjectUnitID",pum."ProjectUnitName"  from "ProjectUnitMaster" pum where pum."IsDeleted" = false`); 
                                        
            if (!res?.length) return { success: 0, msg: "No Project Unit found" };

            return { success: 1, data: res };
        } catch (error) {
            return { success: 0, msg: error.message, error: error.message };
        }
    },
    getDepartment: async (params) => {
        try {
            let res = await db.getResults(`select dm."DepartmentID",dm."DepartmentName"  from "DepartmentMaster" dm where dm."ProjectUnitID" =$1 and dm."MinistryDepartmentID" =$2 and dm."IsDeleted" = false `,[params.unitId,params.ministryId]); 
            if (!res?.length) return { success: 0, msg: "No Department found" };
            return { success: 1, data: res };
        } catch (error) {
            return { success: 0, msg: error.message, error: error.message };
        }
    },

    getDesignation: async (params) => {
        try {
            let res = await db.getResults(`select dm."DesignationID" ,dm."DesignationName" 
                from "DesignationMaster" dm where dm."MinistryDepartmentID" =$1 and dm."ProjectUnitID"=$2  and dm."DepartmentID" =$3 and dm."IsDeleted" = false`,[params.ministryId,params.unitId,params.departmentId]); 
            if (!res?.length) return { success: 0, msg: "No Designation found" };
            return { success: 1, data: res };
        } catch (error) {
            return { success: 0, msg: error.message, error: error.message };
        }
    },

}