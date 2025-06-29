const Joi = require("joi");
const portion = require("../../models/product/portion.model");
const errorUtils = require("../../utils/errorHandler.utils");
const moment = require("moment");
const winston = require("../../config/winston");
const { nameRegex, nameRegexMsg } = require("../../utils/regex.utils");

const compPortionSchema = (data) => {
    const schema = Joi.object({
        companyId: Joi.number().integer().min(1).required(),
        portionName: Joi.string().trim().regex(nameRegex()).min(2).max(50).required().messages(nameRegexMsg('Portion Name')),
    });

    const { value, error } = schema.validate(data);
    if (error) throw errorUtils.createError(error.details[0].message.replace(/"/g, ''), 400);
    return value;
}

module.exports = {
    getPortionList: async (req, res) => {
        try {
            const portionList = await portion.getPortionList(req);
            res.status(200).json({ success: 1, data: portionList });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    getData: async (req, res) => {
        const id = req.params.id;
        const data = req.body;
        try {
            if (!id > 0) throw errorUtils.createError('Portion Not Found', 400);
            if (!data.companyId || data.companyId === 0) throw errorUtils.createError('Invalid Company', 400);

            const resp = await portion.getData(id, data.companyId);
            res.status(200).json({ success: 1, data: resp })
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    create: async (req, res) => {
        try {
            const value = compPortionSchema(req.body);
            const getDuplicatePortion = await portion.getData(0, value.companyId, value.portionName, 1);
            if (getDuplicatePortion?.length > 0) throw errorUtils.createError(`Portion ${value.portionName} is Already exists`, 409);

            const brandData = {
                ...value,
                createdBy: req.user.userId,
                companyId: req.body.companyId,
                ip: req.ip
            };
            const resp = await portion.create(brandData)
            res.status(resp.status).json(resp);
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    update: async (req, res) => {
        const id = req.params.id;

        try {
            if (!id > 0) throw errorUtils.createError('Portion Not Found', 400);
            const value = compPortionSchema(req.body);

            const getDuplicatePortion = await portion.getData(id, value.companyId, value.portionName, 1);
            if (getDuplicatePortion?.length > 0) throw errorUtils.createError(`Portion ${value.portionName} is Already exists`, 409);

            // updating only required field to DB
            let updatedPortion = {};
            if (value.portionName) updatedPortion.portionname = value.portionName;
            if (updatedPortion) {
                updatedPortion.modifieddate = moment().format('YYYY-MM-DD H:m:s');
                updatedPortion.modifiedby = req.user.userId;
            }

            // Only update if at least one field is present
            if (Object.keys(updatedPortion).length === 0) throw errorUtils.createError('No valid fields provided for update', 400);

            const resp = await portion.update(id, updatedPortion);
            res.status(resp.status).json(resp);

        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    delete: async (req, res) => {
        const schema = Joi.object({
            portionId: Joi.number().integer().min(1).required(),
        });

        const { value, error } = schema.validate(req.body);
        try {
            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });
            const resp = await portion.delete(value);
            res.status(resp.status).json(resp);
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }

    },

    getProductPortionList: async (req, res) => {
        try {
            const schema = Joi.object({
                productIds: Joi.array().items(Joi.number().integer().min(1)).required(),
            });
            const { value, error } = schema.validate(req.body);
            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });

            const portionList = await portion.getProductPortionList(value.productIds);
            res.status(200).json({ success: 1, data: portionList });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
}