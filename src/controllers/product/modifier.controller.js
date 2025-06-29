const Joi = require("joi");
const modifier = require("../../models/product/modifier.model");
const errorUtils = require("../../utils/errorHandler.utils");
const winston = require("../../config/winston");
const { nameRegex, nameRegexMsg } = require("../../utils/regex.utils");
const moment = require("moment");
const awsS3configurationService = require("../../services/awsS3configuration.service");

const modifierSchema = (data) => {

    const schema = Joi.object({
        companyId: Joi.number().integer().min(1).required(),
        modifierCategoryId: Joi.number().integer().min(1).required(),
        modifierName: Joi.string().trim().regex(nameRegex()).min(2).max(50).required().messages(nameRegexMsg('Modifier Name')),
        offlinePrice: Joi.number().min(1).required(),
        onlinePrice: Joi.number().optional(),
        foodType: Joi.number().integer().valid(1, 2, 3, 4).default(4),
        parentModifierId: Joi.number().integer().allow('').default(0).optional(),
        maxQtyAllow: Joi.number().integer().required(),
        afterMaxQtyPrice: Joi.number().optional(),
        isOnline: Joi.number().integer().valid(0, 1),
        tag: Joi.array().min(1).items(Joi.string().trim()).optional(),
        image: Joi.optional(),
        removeImage: Joi.boolean().optional()
    });

    const { value, error } = schema.validate(data);

    if (error) throw errorUtils.createError(error.details[0].message.replace(/"/g, ''), 400);
    return value;
}

module.exports = {

    addModifier: async (req, res) => {
        try {
            let value = await modifierSchema(req.body);

            const duplicateModifier = await modifier.getData(0, value?.companyId, value?.modifierName, 0, value?.modifierCategoryId);

            if (duplicateModifier?.length > 0) throw errorUtils.createError(`Modifer ${value?.modifierName} is Already exists`, 409);

            const modifierImageFile = req?.file;
            let modifierImageURL = null;

            if (modifierImageFile && process.env.ACCESS_KEYID) {
                const modifierImgName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Date.now()}_category_${modifierImageFile.originalname}`;

                await awsS3configurationService.awsPutObject(modifierImgName, modifierImageFile.buffer, modifierImageFile.mimetype);
                modifierImageURL = (await awsS3configurationService.awsGetObject(modifierImgName)).split('?')[0];
            }

            value.image = modifierImageURL != null ? modifierImageURL : null;

            const modifierData = {
                companyid: value.companyId,
                modifiercategoryid: value.modifierCategoryId,
                modifiername: value.modifierName,
                price: value.offlinePrice,
                onlineprice: value.onlinePrice,
                foodtype: value.foodType,
                parentmodifierid: value.parentModifierId,
                maxqtyallowed: value.maxQtyAllow,
                aftermaxqtyprice: value.afterMaxQtyPrice,
                isonline: value.isOnline,
                modifierimage: value.image,
                modifierTags: value?.tag?.join(','),
                createdBy: req.user.userId,
                isdeleted: 0,
                createddate: moment().format('YYYY-MM-DD H:m:s'),
                ipaddress: req.ip,
            }

            const resp = await modifier.create(modifierData);
            res.status(resp.status).json(resp);
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
    updateModifier: async (req, res) => {
        try {
            const { modifierId } = req.params;
            const { removeImage } = req.body; 
    
            if (!(modifierId > 0)) return res.status(400).json({ success: 0, msg: 'Invalid modifierId' });
    
            let value = modifierSchema(req.body);
    
            const duplicateModifier = await modifier.getData(modifierId, value.companyId, value.modifierName, 1, value.modifierCategoryId);
            if (duplicateModifier?.length > 0) throw errorUtils.createError(`Modifier ${value.modifierName} already exists in this category`, 409);
    
            const getImageToDelete = await modifier.getData(modifierId);
            const existingImageUrl = getImageToDelete[0]?.modifierimage;
            let updatedModifierImageUrl = existingImageUrl;
    
            if (req.file && process.env.ACCESS_KEYID) {
                const updatedModifierImage = req.file;
    
                if (existingImageUrl) {
                    await awsS3configurationService.awsDeleteObject(existingImageUrl);
                }
    
                const modifierImgName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Date.now()}_prod_${updatedModifierImage.originalname}`;
                await awsS3configurationService.awsPutObject(modifierImgName, updatedModifierImage.buffer, updatedModifierImage.mimetype);
                updatedModifierImageUrl = (await awsS3configurationService.awsGetObject(modifierImgName)).split('?')[0];
    
            } else if (removeImage && existingImageUrl) {
                await awsS3configurationService.awsDeleteObject(existingImageUrl);
                updatedModifierImageUrl = "";
            }
    
            const updateData = {
                companyid: value.companyId,
                modifiercategoryid: value.modifierCategoryId,
                modifiername: value.modifierName,
                price: value.offlinePrice,
                onlineprice: value.onlinePrice,
                foodtype: value.foodType,
                parentmodifierid: value.parentModifierId,
                maxqtyallowed: value.maxQtyAllow,
                aftermaxqtyprice: value.afterMaxQtyPrice,
                isonline: value.isOnline,
                modifierTags: value.tag.join(','),
                modifierimage: updatedModifierImageUrl, // Updated image URL
                modifiedby: req.user.userId,
                modifieddate: moment().format('YYYY-MM-DD H:m:s'),
                ipaddress: req.ip
            };
    
            const resp = await modifier.update(modifierId, updateData);
            res.status(resp.status).json(resp);
    
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
    
    getModifier: async (req, res) => {
        try {
            const { modifierId } = req.params;
            if (!modifierId > 0) throw errorUtils.createError('Invalid ModifierId', 400);

            const resp = await modifier.getData(modifierId);

            return res.status(200).json({ success: 1, data: resp });

        } catch (error) {
            winston.error(error);
            return res.status(error.statusCode || 500).json({
                success: 0,
                msg: error.message || "Internal Server Error",
            });
        }
    },
    getModifierList: async (req, res) => {
        try {
            let companyId = req.body.companyId
            if (!companyId > 0) throw errorUtils.createError('Invalid CompanyId', 400);

            const resp = await modifier.getModifierList(req)

            res.status(200).json({ success: 1, data: resp })

        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
    deleteModifier: async (req, res) => {
        try {
            const schema = Joi.object({
                modifierId: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
            });

            const { value, error } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });
            }

            const imagesToDelete = await modifier.getMultipleImagePath(value.modifierId);
            const imagePaths = imagesToDelete.map((img) => img.modifierimage);

            if (imagePaths.length > 0 && process.env.ACCESS_KEYID) {
                await Promise.all(imagePaths.map((img) => awsS3configurationService.awsDeleteObject(img)));
            }

            const modifierData = {
                modifiedBy: req.user.userId,
                modifiedDate: moment().format('YYYY-MM-DD H:m:s'),
                ipAddress: req.ip,
                modifierimage: null,
                isdeleted: 1
            };

            const resp = await modifier.deleteModifier(value.modifierId, modifierData);

            return res.status(resp.status).json(resp);
        } catch (error) {
            winston.error(error);
            return res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
    getModifierOfCategory: async (req, res) => {
        try {
            const schema = Joi.object({
                companyId: Joi.number().integer().min(1),
                modifierCategoryId: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
            });

            const { value, error } = schema.validate(req.body);

            if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });

            const resp = await modifier.getModifierOfCategory(value.companyId, value.modifierCategoryId)

            res.status(200).json({ success: 1, data: resp })

        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    }

}