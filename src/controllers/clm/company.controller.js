const errorUtils = require("../../utils/errorHandler.utils");
const company= require("../../models/clm/company.model.js");
const winston = require("../../config/winston.js");
const Joi = require('joi');

module.exports = {
    getCompany: async (req, res) => {
        try {
            if (req.user.roleId !== 0 || req.user.policyId !== 0) throw errorUtils.createError('You are not allowed to get company', 403);

            const getCompanies = await company.getCompanies(req.query);
            res.status(200).json({success: 1, data: getCompanies})
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
    companyChannelMapping: async (req, res) => {
        const { companyId, channelId } = req.body;
        const schema = Joi.object({
            companyId: Joi.number().required(),
            channelId: Joi.array()
            .items(Joi.number().integer().min(1))
            .required(),
        });
        const {value, error } = schema.validate(req.body);      
        if (error) {
            return res.status(400).json({
                success: 0,
                msg: error.details[0].message.replace(/"/g, ""),
            });
        }
        try {
            const checkChannelCompanyMapping = await company.checkCompanyChannelMapping(companyId, channelId);
            if (checkChannelCompanyMapping?.success === 0) {
                return res.status(400).json({ success: 0, msg: checkChannelCompanyMapping.msg });
            }
            const newMappings = checkChannelCompanyMapping;
            if (newMappings?.length > 0) {
                const data = newMappings.map(id => [companyId, id])
                const channelCompanyMapping = await company.companyChannelMapping(data);
                res.status(200).json({ success: 1, data: channelCompanyMapping });
            } else {
                res.status(200).json({ success: 1, msg: 'No new mappings to insert' });
            }
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    }

}