const errorUtils = require("../../utils/errorHandler.utils");
const location = require("../../models/clm/location.model");
const winston = require("../../config/winston.js");
const Joi = require("joi");

module.exports = {
    getLocationList: async (req, res) => {
        try {
            const data = req.body;
            if (!data.companyId || data.companyId === 0) throw errorUtils.createError('Invalid Company', 400);

            const getLocation = await location.getLocation(req.body.companyId);
            res.status(200).json({ success: 1, data: getLocation });
        } catch (error) {
            console.error(error);
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    getFranchiseeLocationList: async (req, res) => {
        try {
            const schema = Joi.object({
                companyId: Joi.number().integer().min(1).required(),
                locationIds: Joi.array().items(Joi.number().integer().min(1)).required()
            });
            const { value, error } = schema.validate(req.body);
            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, ""), });

            const getLocation = await location.getFranchiseeLocationList(value.companyId, value.locationIds);
            res.status(200).json({ success: 1, data: getLocation });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    }

}