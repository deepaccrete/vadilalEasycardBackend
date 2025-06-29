const Joi = require("joi");
const productSubCat = require("../../models/product/productSubCategory.model");
const errorUtils = require("../../utils/errorHandler.utils");
const moment = require("moment");
const winston = require("./../../config/winston");
const { nameRegex, nameRegexMsg } = require("../../utils/regex.utils");
const date = moment();

const prodSubCatSchema = (data) => {
    const schema = Joi.object({
        companyId: Joi.number().integer().min(1).required(),
        productCatId: Joi.number().integer().min(1).required(),
        productSubCatName: Joi.string().trim().regex(nameRegex()).min(2).max(50).required().messages(nameRegexMsg('Subcategory Name')),
        displayOrder: Joi.number().integer().allow(''),
    });

    const { value, error } = schema.validate(data);

    if(error) throw errorUtils.createError(error.details[0].message.replace(/"/g, ''), 400);
    return value;
}

module.exports = {
    
    getProductSubcategoryList: async (req, res, next) => {
        const data = req.body;
        try {
            if (!data.companyId || data.companyId === 0) throw errorUtils.createError('Invalid Company', 400);

            const prodSubCatList = await productSubCat.getProductSubcategoryList(req);
            
            res.status(200).json({ success: 1, data: prodSubCatList });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    getData: async (req, res) => {
        const prodSubCatId = req.params.id;
        try {
            const resp = await productSubCat.getData(prodSubCatId, req.body.companyId);

            res.status(200).json({ success: 1, data: resp })
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    addProductSubcategory: async (req, res) => {
        try {
            const value = prodSubCatSchema(req.body);
            const duplicateSubcategory = await productSubCat.findDuplicate(value);
            if (duplicateSubcategory?.length > 0) throw errorUtils.createError(`Subcategory ${value.productSubCatName} is Already exists`, 409);

            const prodCatData = {
                ...value,
                createdby: req.user.userId,
                companyid: value.companyId
            };
            const resp = await productSubCat.insert(prodCatData, req.ip)
            res.status(resp.status).json(resp);
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    updateProductSubcategory: async (req, res) => {
        try {
            if (!req.params.id > 0) return errorUtils.createError('Invalid Subcategory', 400);
            const value = prodSubCatSchema(req.body);
            // Fetch the existing user from the database by id
            const duplicateSubcategory = await productSubCat.findDuplicate(value, req.params.id);

            if (duplicateSubcategory?.length > 0) throw errorUtils.createError(`${value.productSubCatName} is already used. Please use unique name`, 404);

            // updating only required field to DB
            let updatedProdSubCat = {};
            if (value.productCatId) updatedProdSubCat.productcategoryid = value.productCatId;
            if (value.productSubCatName) updatedProdSubCat.subcategoryname = value.productSubCatName;
            if (value.displayOrder) updatedProdSubCat.displayorder = value.displayOrder;
            if (updatedProdSubCat) {
                updatedProdSubCat.modifieddate = date.format('YYYY-MM-DD H:m:s');
                updatedProdSubCat.modifiedby = req.user.userId;
            }

            // Only update if at least one field is present
            if (Object.keys(updatedProdSubCat).length === 0) throw errorUtils.createError('No valid fields provided for update', 400);

            const resp = await productSubCat.update(req.params.id, updatedProdSubCat);
            res.status(resp.status).json(resp);

        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    delete: async (req, res) => {
        const schema = Joi.object({
            prodSubCatId: Joi.number().integer().min(1).required(),
        });

        const { value, error } = schema.validate(req.body);
        try {
            if(error) return res.status(400).json({success: 0, msg: error.details[0].message.replace(/"/g, '')});
            const resp = await productSubCat.delete(value.prodSubCatId);
            res.status(resp.status).json(resp);
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }

    },
}