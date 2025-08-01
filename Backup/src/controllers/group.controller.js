const Joi = require("joi");
const groupmodel = require("../models/group.model");
const winston = require("../config/winston");
const moment = require("moment");



module.exports = {
insertgroup : async (req, res) => {
    const schema = Joi.object({
                groupname: Joi.string().trim().min(4).max(100).required(), 
            });
    
            const { error } = schema.validate(req.body);
        try {
            if(error) return res.status(400).json({success: 0, msg: error.details[0].message.replace(/"/g, '')});
            const getRegion = await groupmodel.insertgroup(req.body,req.info);
            if(getRegion.success != 1){
                return res.status(getRegion.success).json({success:0,msg:getRegion.msg});
            } 
            res.status(200).json({ success: 1, data: getRegion.data });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
    getgroup : async (req, res) => {
        try {
            const getgroup = await groupmodel.getgroup();

            if(getgroup.success != 1){
                return res.status(getgroup.success).json({success:0,msg:getgroup.msg});
            } 
            res.status(200).json({ success: 1, data: getgroup.data });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
}


