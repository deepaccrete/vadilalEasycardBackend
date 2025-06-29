const Joi = require("joi");
const product = require("../../models/product/product.model");
const errorUtils = require("../../utils/errorHandler.utils");
const winston = require('../../config/winston');
const { nameRegex, nameRegexMsg } = require("../../utils/regex.utils");
const awsS3configuration = require("../../services/awsS3configuration.service.js");
const awsS3configurationService = require("../../services/awsS3configuration.service.js");

const productSchema = (data) => {
    const schema = Joi.object({
        companyId: Joi.number().integer().min(0).required(),
        prodCatId: Joi.number().integer().min(1).required(),
        prodSubCatId: Joi.number().integer().min(1).allow('').optional(),
        prodCode: Joi.string().min(1).max(30).required(),
        prodName: Joi.string().trim().regex(nameRegex()).min(2).max(50).required().messages(nameRegexMsg('Product Name')),
        prodAppearances: Joi.number().valid(1, 2, 3).required(),
        eqInventoryItem: Joi.allow(''),
        foodCost: Joi.number().min(1).required(),
        taxProfileId: Joi.number().integer().min(1).required(),
        dispOnDashboard: Joi.number().valid(0, 1).required(),
        isMandModSel: Joi.number().valid(0, 1).required(),
        ignoreTax: Joi.number().valid(0, 1).required(),
        ignoreDisc: Joi.number().valid(0, 1).required(),
        isRecommend: Joi.number().valid(0, 1).required(),
        prodDesc: Joi.string().allow(''),
        prodImg: Joi.any().allow("").optional(),
        onlineImg: Joi.any().allow("").optional(),
        sellItemAs: Joi.number().valid(1, 2).required(),
        hsnSecCode: Joi.string().allow(''),
        vegNonveg: Joi.number().valid(0, 1).required(),
        color: Joi.string().allow(''),
        isActive: Joi.number().valid(0, 1).required(),
        surveingInformation: Joi.string().min(2).allow('').optional(),
        nutritionInformation: Joi.string().min(2).allow('').optional(),

        portions: Joi.array().items(
            Joi.object({
                productPortionId: Joi.number().integer().optional(),
                portionId: Joi.number().integer().min(1).required(),
                isDefault: Joi.number().valid(0, 1).required(),
                // name: Joi.string().trim().regex(nameRegex()).min(2).max(50).required().messages(nameRegexMsg('Portion Name')),
                posPrice: Joi.number().min(1).required(),
                onlinePrice: Joi.when(Joi.ref('/menuId'), {
                    is: data.menuId && Joi.array().min(1),
                    then: Joi.number().min(1).required(),
                    otherwise: Joi.optional()
                }),
                markupPrice: Joi.when(Joi.ref('/menuId'), {
                    is: data.menuId && Joi.array().min(1),
                    then: Joi.number().min(1).required(),
                    otherwise: Joi.optional()
                }),
                prodCode: Joi.when(Joi.ref('/menuId'), {
                    is: data.menuId && Joi.array().min(1),
                    then: Joi.string().min(1).required(),
                    otherwise: Joi.optional()
                }),
            })
        ).required(),

        menuId: Joi.array().items(Joi.number().integer().positive()).optional().allow('').min(0),

        locationId: Joi.when('isOnlineSell', {
            is: 1,
            then: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
            otherwise: Joi.array().items(Joi.number().integer().positive()).optional().min(0),
        }),

        channelId: Joi.when('isOnlineSell', {
            is: 1,
            then: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
            otherwise: Joi.array().items(Joi.number().integer().positive()).optional().min(0),
        }),
        isOnlineSell: Joi.number().valid(0, 1).optional(),
        removeImageProd: Joi.boolean().optional().default(false),
        removeImageOnline: Joi.boolean().optional().default(false),
        productTagIds: Joi.array().items(Joi.number().integer()).default([]),
    });
    const { value, error } = schema.validate(data);
    if (error) throw errorUtils.createError(error.details[0].message.replace(/"/g, ''), 400);
    return value;
}

module.exports = {
    insertProduct: async (req, res) => {
        try {
            const value = productSchema(req.body);
            const duplicateProduct = await product.getProduct(value);

            if (duplicateProduct[0]?.count > 0) throw errorUtils.createError('A product with this code already exists in the company. Please use a unique product code.', 409);

            if (duplicateProduct[1]?.count > 0) throw errorUtils.createError('This product name is already in use within the same category. Please choose a different name.', 409);

            const prodImgFile = (req.files && req.files?.["prodImg"]) ? req.files["prodImg"][0] : null;
            const onlineImgFile = (req.files && req.files?.["onlineImg"]) ? req.files["onlineImg"][0] : null;

            const MAX_FILE_SIZE = 5 * 1024 * 1024;

            if (prodImgFile && prodImgFile.size > MAX_FILE_SIZE) {
                throw errorUtils.createError('Product image size exceeds the 5 MB limit.', 400);
            }

            if (onlineImgFile && onlineImgFile.size > MAX_FILE_SIZE) {
                throw errorUtils.createError('Online image size exceeds the 5 MB limit.', 400);
            }

            // Convert to Base64 if image is uploaded
            const prodImgBase64 = prodImgFile ? prodImgFile.buffer.toString('base64') : null;
            let prodImgURL = null;
            let onlineImgURL = null;

            if (prodImgFile && process.env.ACCESS_KEYID) {
                const prodImgName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Date.now()}_prod_${prodImgFile.originalname}`;

                await awsS3configuration.awsPutObject(prodImgName, prodImgFile.buffer, prodImgFile.mimetype);
                prodImgURL = (await awsS3configuration.awsGetObject(prodImgName)).split('?')[0];
            }

            if (onlineImgFile && process.env.ACCESS_KEYID) {
                const onlineImgName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Date.now()}_online_${onlineImgFile.originalname}`;

                await awsS3configuration.awsPutObject(onlineImgName, onlineImgFile.buffer, onlineImgFile.mimetype);
                onlineImgURL = (await awsS3configuration.awsGetObject(onlineImgName)).split('?')[0];
            }
            value.prodImg = prodImgURL;
            value.onlineImg = onlineImgURL;
            value.prodImgBase64 = prodImgBase64;

            const resp = await product.insertProduct(value, req.user.userId, req.ip);
            res.status(resp.status).json(resp);
        } catch (error) {
            winston.error(error)
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    updateProduct: async (req, res) => {
        const id = Number(req.params.id);

        try {
            const value = productSchema(req.body);
            if (!id > 0) throw errorUtils.createError('Invalid Product', 400);

            const duplicateProduct = await product.getProduct(value, id);

            if (duplicateProduct[0]?.count > 0) throw errorUtils.createError('A product with this code already exists in the company. Please use a unique product code.', 409);

            if (duplicateProduct[1]?.count > 0) throw errorUtils.createError('This product name is already in use within the same category. Please choose a different name.', 409);

            let getImagesToDelete = await product.getProductData(id)

            const existingProductImageUrl = getImagesToDelete[0]?.productimg;
            const existingOnlineImageUrl = getImagesToDelete[0]?.onlineimg;
            const existingBufferData = getImagesToDelete[0]?.productbuffer;

            const prodImgFile = (req.files && req.files?.prodImg) ? req.files?.prodImg[0] : null;

            // Convert to Base64 if image is uploaded
            const prodImgBase64 = prodImgFile ? prodImgFile.buffer.toString('base64') : null;

            let updatedProductImageUrl = existingProductImageUrl;
            let updatedOnlineImageUrl = existingOnlineImageUrl;


            if (req.files?.prodImg && process.env.ACCESS_KEYID) {
                const updatedProductImage = req.files?.prodImg[0];
                if (existingProductImageUrl) {
                    await awsS3configurationService.awsDeleteObject(existingProductImageUrl);
                }

                const prodImgName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Date.now()}_prod_${updatedProductImage?.originalname}`;
                await awsS3configurationService.awsPutObject(prodImgName, updatedProductImage.buffer, updatedProductImage.mimetype);
                updatedProductImageUrl = (await awsS3configurationService.awsGetObject(prodImgName)).split('?')[0];
                value.prodImgBase64 = prodImgBase64;
            } else if (value.removeImageProd && existingProductImageUrl) {
                value.prodImgBase64 = null;
                await awsS3configurationService.awsDeleteObject(existingProductImageUrl);
                updatedProductImageUrl = null;
            } else {
                value.prodImgBase64 = existingBufferData;
            }



            if (req.files?.onlineImg && process.env.ACCESS_KEYID) {
                const updatedOnlineImage = req.files?.onlineImg[0];
                if (existingOnlineImageUrl) {
                    await awsS3configurationService.awsDeleteObject(existingOnlineImageUrl);
                }

                const onlineImgName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Date.now()}_online_${updatedOnlineImage?.originalname}`;

                await awsS3configurationService.awsPutObject(onlineImgName, updatedOnlineImage.buffer, updatedOnlineImage.mimetype);
                updatedOnlineImageUrl = (await awsS3configurationService.awsGetObject(onlineImgName)).split('?')[0];

            } else if (value.removeImageOnline && existingOnlineImageUrl) {
                await awsS3configurationService.awsDeleteObject(existingOnlineImageUrl);
                updatedOnlineImageUrl = null;
            }

            value.prodImg = updatedProductImageUrl;
            value.onlineImg = updatedOnlineImageUrl;

            const resp = await product.updateProduct(value, req.user.userId, req.ip, id);
            res.status(resp.status).json(resp);
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    fetchProducts: async (req, res) => {
        try {
            const data = req.body;
            if (!data.companyId || data.companyId === 0) throw errorUtils.createError('Invalid Company', 400);

            const response = await product.fetchProducts(req);
            res.status(200).json({ success: 1, data: response })
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    getProductDataById: async (req, res) => {
        try {
            const id = req.params.id;
            if (!id > 0) throw errorUtils.createError('Not Found', 400);

            const resp = await product.getProductDataById(id);
            res.status(200).json(resp);
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    getMenuPrice: async (req, res) => {
        try {
            const id = req.params.id;
            if (!id > 0) throw errorUtils.createError('Product Not Found', 400)

            const resp = await product.getMenuPrice(id);
            res.status(200).json({ success: 1, data: resp });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    updateMenuPrice: async (req, res) => {
        const schema = Joi.object({
            companyId: Joi.number().integer().min(1).required(),
            products: Joi.array().items(
                Joi.object({
                    menuId: Joi.number().integer().min(1).required(),
                    productPortionId: Joi.number().integer().min(1).required(),
                    price: Joi.number().min(1).required(),
                    onlinePrice: Joi.number().min(1).required(),
                    markupPrice: Joi.number().min(1).required(),
                })
            ).required()
        });
        const { value, error } = schema.validate(req.body);
        try {
            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });
            const resp = await product.updateMenuPrice(value);
            res.status(resp.status).json(resp);
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    getProductMenuMapping: async (req, res) => {
        try {
            const id = req.params.id;
            const data = req.body;
            if (!data.companyId || data.companyId === 0) throw errorUtils.createError('Invalid Company', 400);
            if (!id > 0) throw errorUtils.createError('Product Not Found', 400);

            const resp = await product.getProductMenuMapping(data.companyId, id);
            res.status(200).json({ success: 1, data: resp });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    updateProductMenuMapping: async (req, res) => {
        const schema = Joi.object({
            companyId: Joi.number().integer().min(1).required(),
            menuArray: Joi.array().items(
                Joi.object({
                    menuId: Joi.number().integer().min(1).required()
                })
            ).required()
        });
        const { value, error } = schema.validate(req.body);
        try {
            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });
            const id = req.params.id;
            if (!id > 0) throw errorUtils.createError('Product Not Found', 400);

            const resp = await product.updateProductMenuMapping(value, id, req.user.userId, req.ip);
            res.status(resp.status).json(resp);

        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    getProductOnlineMapping: async (req, res) => {
        const id = req.params.id;
        const schema = Joi.object({
            companyId: Joi.number().integer().min(1).required(),
            locations: Joi.array().required()
        });
        const { value, error } = schema.validate(req.body);
        try {
            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });
            if (!id > 0) throw errorUtils.createError('Invalid Product', 400);

            const resp = await product.getLocationChannelList(id, value);
            res.status(200).json({ success: 1, data: resp });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    updateProductOnlineMapping: async (req, res) => {
        const id = req.params.id;

        const schema = Joi.object({
            companyId: Joi.number().integer().min(1).required(),
            locationArray: Joi.array().items(
                Joi.object({
                    locationId: Joi.number().integer().min(1).required(),
                    channelId: Joi.number().integer().min(1).required()
                })
            ).required()
        });
        const { value, error } = schema.validate(req.body);
        try {
            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });
            if (!id > 0) throw errorUtils.createError('Product Not Found', 400);

            const resp = await product.updateProductOnlineMapping(value, Number(id), req.user.userId, req.ip);
            res.status(resp.status).json(resp);

        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    deleteProducts: async (req, res) => {
        const schema = Joi.object({
            companyId: Joi.number().integer().min(1).required(),
            productId: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
        });

        const { value, error } = schema.validate(req.body);
        try {
            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });

            const imagesToDelete = await product.getMultipleImagePath(value.productId);

            const imagePaths = imagesToDelete.map((img) => img.productimg);
            const onineImagePaths = imagesToDelete.map((img) => img.onlineimg);

            if (imagePaths.length > 0 && process.env.ACCESS_KEYID) {
                await Promise.all(imagePaths.map((img) => awsS3configuration.awsDeleteObject(img)));
            }

            if (onineImagePaths.length > 0 && process.env.ACCESS_KEYID) {
                await Promise.all(onineImagePaths.map((img) => awsS3configuration.awsDeleteObject(img)));
            }

            const resp = await product.delete(value, req.user.userId, req.ip);
            res.status(resp.status).json(resp);
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    getProductFromCategory: async (req, res) => {
        const schema = Joi.object({
            productCategoryId: Joi.array().items(Joi.number().integer().min(1)).required(),
        });
        const { value, error } = schema.validate(req.body);
        try {
            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, ""), });
            if (!value.productCategoryId.length) throw errorUtils.createError("Product Category is required to select", 400)
                
            const resp = await product.getProductFromCategory(value.productCategoryId);
            res.status(200).json({ success: 1, data: resp });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
}