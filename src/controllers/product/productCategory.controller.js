const Joi = require("joi");
const productCat = require("../../models/product/productCategory.model");
const errorUtils = require("../../utils/errorHandler.utils");
const moment = require("moment");
const winston = require("../../config/winston");
const { nameRegex, nameRegexMsg } = require("../../utils/regex.utils");
const awsS3configuration = require("../../services/awsS3configuration.service");
const date = moment();

const compSchema = (data) => {
    const schema = Joi.object({
        companyId: Joi.number().integer().min(1).required(),
    });
    const { value, error } = schema.validate(data);

    if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });
    return value;
};

const categoryMasterSchema = (data) => {
    const schema = Joi.object({
        companyId: Joi.number().integer().min(1).required(),
        brandId: Joi.number().integer().min(1).allow('').optional(),
        productCatName: Joi.string().trim().regex(nameRegex()).min(2).max(50).required().messages(nameRegexMsg('Category Name')),
        displayOrder: Joi.number().integer().allow('').optional(),
        backcolor: Joi.string().allow('').optional(),
        productCatAppearance: Joi.number().integer().allow(''),
        descriptions: Joi.string().trim().regex(nameRegex()).min(2).max(200).allow("").messages(nameRegexMsg('Category Description')),
        image: Joi.any().allow('').optional(),
        onlineDispName: Joi.string().allow(''),
        status: Joi.number().valid(0, 1).required(),
        hideFromPos: Joi.number().valid(0, 1).required(),
        hideFromOnlineOrdering: Joi.number().valid(0, 1).required(),
        tag: Joi.string().min(2).max(200).allow('').optional(),
        linkOffer: Joi.number().valid(0, 1).optional(),

        // weekData: Joi.array().items(
        //     Joi.object({
        //         day: Joi.number().integer().min(0).max(6).required(),
        //         isChecked: Joi.boolean().required(),
        //         timeSlots: Joi.array().items(
        //             Joi.object({
        //                 from: Joi.string().required(),
        //                 to: Joi.string().required(),
        //             })
        //         ).default([]),
        //     })
        // ).optional(),
    });

    const { value, error } = schema.validate(data);

    if (value, error) throw errorUtils.createError(error.details[0].message.replace(/"/g, ''), 400);
    return value;
};

module.exports = {

    getProductCategoryList: async (req, res, next) => {
        const schema = Joi.object({
            companyId: Joi.number().integer().min(1).required(),
        });

        const { value, error } = schema.validate(req.body);
        try {
            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });

            const prodCatList = await productCat.getProductCategoryList(req);
            res.status(200).json({ success: 1, data: prodCatList });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    getData: async (req, res) => {
        try {
            const prodCatId = req.params.prodcatid;
            const value = compSchema(req.body);
            const resp = await productCat.getData(prodCatId, value.companyId);
            res.status(200).json({ success: 1, data: resp })
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    addProductCategory: async (req, res) => {
        try {
            const value = categoryMasterSchema(req.body);

            const getDuplicateCategory = await productCat.findDuplicate(value.productCatName, value.companyId);

            if (getDuplicateCategory?.length > 0) throw errorUtils.createError('A category with this name already exists in the company. Please use a unique name', 409)

            const categoryImageFile = req?.file || null;
            let categoryImageURL = null;

            if (categoryImageFile && process.env.ACCESS_KEYID) {
                const prodImgName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Date.now()}_category_${categoryImageFile.originalname}`;

                await awsS3configuration.awsPutObject(prodImgName, categoryImageFile.buffer, categoryImageFile.mimetype);
                categoryImageURL = (await awsS3configuration.awsGetObject(prodImgName)).split('?')[0];
            }

            // value.categoryImg = categoryImageURL;
            const prodCatData = {
                ...value,
                createdby: req.user.userId,
                companyid: req.body.companyId,
                categoryImg: categoryImageURL
                // weekData: JSON.stringify(value.weekData || [])
            };

            const resp = await productCat.insert(prodCatData, req.ip)
            res.status(resp.status).json(resp);
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    updateProductCategory: async (req, res) => {
        try {
            if (!req.params.id > 0) throw errorUtils.createError('Invalid Product', 400)
            const value = categoryMasterSchema(req.body);

            const getDuplicateCategory = await productCat.findDuplicate(value.productCatName, value.companyId, req.params.id);

            if (getDuplicateCategory?.length > 0) throw errorUtils.createError('A category with this name already exists in the company. Please use a unique name', 409)

            const resp = await productCat.getData(req.params.id, value.companyId);
            if (resp?.length === 0) throw errorUtils.createError('Product category not found', 404);

            const prodImgFile = req?.files || null;
            let prodCatImgURL = null;
            const getImageToDelete = await productCat.getData(req.params.id, value.companyId);

            if (prodImgFile && process.env.ACCESS_KEYID) {
                const prodCatImg = getImageToDelete[0]?.productimgpath;
                // Delete Old Image
                if (prodCatImg) await awsS3configuration.awsDeleteObject(prodCatImg);

                const prodCatImgName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Date.now()}_productcategory_${prodImgFile.originalname}`;

                await awsS3configuration.awsPutObject(prodCatImgName, prodImgFile.buffer, prodImgFile.mimetype);
                prodCatImgURL = (await awsS3configuration.awsGetObject(prodCatImgName)).split('?')[0];
            }

            // updating only required field to DB
            let updatedProdCat = {};
            if (value.productCatName) updatedProdCat.productcategoryname = value.productCatName;
            if (value.brandId) updatedProdCat.brandid = value.brandId;
            if (value.onlineDispName) updatedProdCat.onlinedisplyname = value.onlineDispName;
            if (value.displayOrder) updatedProdCat.displayorder = value.displayOrder;
            if (value.backcolor) updatedProdCat.backcolor = value.backcolor;
            if (value.productCatAppearance) updatedProdCat.productcatappearance = value.productCatAppearance;
            if (value.descriptions) updatedProdCat.descriptions = value.descriptions;
            if (value.onlineDisplyName) updatedProdCat.onlinedisplyname = value.onlineDisplyName;
            if (value.weekData) updatedProdCat.weekdata = JSON.stringify(value.weekData);
            if (value.status) updatedProdCat.status = value.status;
            if (value.hideFromPos) updatedProdCat.hidefrompos = value.hideFromPos;
            if (value.hideFromOnlineOrdering) updatedProdCat.hidefromonlineordering = value.hideFromOnlineOrdering;
            if (value.tag) updatedProdCat.tag = value.tag;
            if (value.linkOffer) updatedProdCat.linkOffer = value.linkOffer;
            if (prodCatImgURL) updatedProdCat.productimgpath = prodCatImgURL;
            if (updatedProdCat) {
                updatedProdCat.modifieddate = date.format('YYYY-MM-DD H:m:s');
                updatedProdCat.modifiedby = req.user.userId;
            }

            // Only update if at least one field is present
            if (Object.keys(updatedProdCat)?.length === 0) throw errorUtils.createError('No valid fields provided for update', 400);
            const result = await productCat.update(req.params.id, updatedProdCat);
            res.status(result.status).json(result);

        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    delete: async (req, res) => {
        const schema = Joi.object({
            companyId: Joi.number().integer().min(1).required(),
            productCategoryIds: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
        });

        const { value, error } = schema.validate(req.body);
        try {
            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });

            const imagesToDelete = await productCat.getMultipleImagePath(value.productCategoryIds);
            const imagePaths = imagesToDelete.map((img) => img.productimgpath);

            if (imagePaths.length > 0 && process.env.ACCESS_KEYID) {
                await Promise.all(imagePaths.map((img) => awsS3configuration.awsDeleteObject(img)));
            }

            const resp = await productCat.delete(value.productCategoryIds, req.user.userId, req.ip);
            res.status(resp.status).json(resp);
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }

    },
}