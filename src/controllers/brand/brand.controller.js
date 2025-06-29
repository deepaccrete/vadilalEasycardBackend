const Joi = require("joi");
const brand = require("../../models/brand/brand.model");
const errorUtils = require("../../utils/errorHandler.utils");
const winston = require("../../config/winston");
const moment = require("moment");
const { nameRegex, nameRegexMsg } = require("../../utils/regex.utils");

module.exports = {
    getBrands: async (req, res, next) => {
        try {
            const brandList = await brand.getBrands(req);
            res.status(200).json({ success: 1, data: brandList });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    getData: async (req, res) => {
        const id = req.params.id;
        const schema = Joi.object({
            companyId: Joi.number().integer().min(1).required(),
        });
        const { value, error } = schema.validate(req.body);

        try {
            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });

            const resp = await brand.getData(id, value.companyId);
            res.status(200).json({ success: 1, data: resp })
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    create: async (req, res) => {
        const schema = Joi.object({
            brandName: Joi.string().trim().regex(nameRegex()).min(2).max(50).required().messages(nameRegexMsg('Brand Name')),
            companyId: Joi.number().integer().min(1).required(),
        });

        try {
            const { value, error } = schema.validate(req.body);
            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });
            // return
            const getDuplicateBrand = await brand.getData(0, value.companyId, value.brandName);
            if (getDuplicateBrand?.length > 0) throw errorUtils.createError(`Brand ${value.brandName} is Already exists`, 409);

            const brandData = {
                ...value,
                createdBy: req.user.userId,
                createdDate: moment().format('YYYY-MM-DD H:m:s'),
                isdeleted: 0,
                ipaddress: req.ip
            };
            const resp = await brand.create(brandData)
            res.status(resp.status).json(resp);
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    update: async (req, res) => {
        const id = req.params.id;
        const schema = Joi.object({
            companyId: Joi.number().integer().min(1).required(),
            brandName: Joi.string().trim().regex(nameRegex()).min(2).max(50).required().messages(nameRegexMsg('Brand Name')),
        });

        const { value, error } = schema.validate(req.body);

        try {
            if (error) return errorUtils.createError(error.details[0].message.replace(/"/g, ''), 400);
            if (!id > 0) throw errorUtils.createError('Brand Not Found', 400);
            // Fetch the existing user from the database by id
            const getDuplicateBrand = await brand.getData(id, value.companyId, value.brandName, 1);
            if (getDuplicateBrand?.length > 0) throw errorUtils.createError(`Brand ${value.brandName} is Already exists`, 409);

            // updating only required field to DB
            const brandObj = {
                brandName: value.brandName,
                updatedBy: req.user.userId,
                updatedDate: moment().format('YYYY-MM-DD H:m:s'),
                ipaddress: req.ip
            };
            const resp = await brand.update(id, brandObj);
            res.status(resp.status).json(resp);

        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    delete: async (req, res) => {
        const schema = Joi.object({
            companyId: Joi.number().integer().min(1).required(),
            brandId: Joi.number().integer().min(1).required(),
        });

        const { value, error } = schema.validate(req.body);
        try {
            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });

            const brandObj = {
                // ...value,
                isdeleted: 1,
                updatedBy: req.user.userId,
                updatedDate: moment().format('YYYY-MM-DD H:m:s'),
                ipaddress: req.ip
            }
            const resp = await brand.delete(brandObj, value.brandId);
            res.status(resp.status).json(resp);
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }

    },
}