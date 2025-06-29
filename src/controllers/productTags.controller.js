const Joi = require("joi");
const productTag = require("../models/productTags.model.js");
const errorUtils = require("../utils/errorHandler.utils");
const winston = require("../config/winston");
const moment = require("moment");
const awsS3configurationService = require("../services/awsS3configuration.service");
const { nameRegex, nameRegexMsg } = require("../utils/regex.utils");

const productTagSchema = (data) => {
  const schema = Joi.object({
    companyId: Joi.number().integer().min(1).optional(),
    tagName: Joi.string().trim().regex(nameRegex()).min(2).max(50).required().messages(nameRegexMsg('Tag Name')),
    image: Joi.optional(),
    removeImage: Joi.boolean().optional(),
  });
  const { value, error } = schema.validate(data);
  if (error) throw errorUtils.createError(error.details[0].message.replace(/"/g, ''), 400);
  return value;
}


module.exports = {
  getProductTagList: async (req, res) => {
    try {
      const getProductTagList = await productTag.getProductTagList(req);
      res.status(200).json({ success: 1, data: getProductTagList });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  getProductTagData: async (req, res) => {
    const tagId = req.params.tagId;
    try {
      if (!tagId > 0) return res.status(400).json({ success: 0, msg: 'Invalid Product Tag' });

      const resp = await productTag.getProductTagData(tagId);
      res.json({ success: 1, data: resp })
    }
    catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  createProductTag: async (req, res) => {
    try {
      const value = productTagSchema(req.body);
      const tagImageFile = req?.file;
      let tagImageURL = null;

      const MAX_TAG_IMAGE_SIZE = 50 * 1024;

      if (tagImageFile && tagImageFile.size > MAX_TAG_IMAGE_SIZE) {
        throw errorUtils.createError('Tag image size exceeds the 50 KB limit.', 400);
      }


      if (tagImageFile && process.env.ACCESS_KEYID) {
        const tagImgName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Date.now()}_category_${tagImageFile.originalname}`;
        await awsS3configurationService.awsPutObject(tagImgName, tagImageFile.buffer, tagImageFile.mimetype);
        tagImageURL = (await awsS3configurationService.awsGetObject(tagImgName)).split('?')[0];
      }

      const getDuplicateProductTag = await productTag.getProductTagData(0, value.tagName);
      if (getDuplicateProductTag?.length > 0) throw errorUtils.createError(`tag Name is Already exists`, 409);

      const productTagData = {
        ...value,
        tagimage: tagImageURL,
        createdby: req.user.userId,
        createddate: moment().format('YYYY-MM-DD H:m:s'),
      };

      const resp = await productTag.createProductTag(productTagData);
      res.status(resp.status).json(resp);
    } catch (error) {

      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  updateProductTag: async (req, res) => {

    const productTagId = req.params.productTagId;

    try {
      const value = productTagSchema(req.body);
      if (!productTagId > 0) throw errorUtils.createError('Invalid Product Tag', 400);

      const getDuplicateProductTag = await productTag.getProductTagData(productTagId, value.tagName, true);
      if (getDuplicateProductTag?.length > 0) throw errorUtils.createError(`Product tag is Already exists`, 409);


      const getImageToDelete = await productTag.getProductTagData(productTagId);

      const existingImageUrl = getImageToDelete[0]?.tagImage;
      let updatedTagImageUrl = existingImageUrl;



      if (req.file && process.env.ACCESS_KEYID) {
        const updatedTagImage = req.file;

        const MAX_TAG_IMAGE_SIZE = 50 * 1024;

        if (updatedTagImage && updatedTagImage.size > MAX_TAG_IMAGE_SIZE) {
          throw errorUtils.createError('Tag image size exceeds the 50 KB limit.', 400);
        }

        if (existingImageUrl) {
          await awsS3configurationService.awsDeleteObject(existingImageUrl);
        }

        const tagImgName = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}/${Date.now()}_prod_${updatedTagImage.originalname}`;
        await awsS3configurationService.awsPutObject(tagImgName, updatedTagImage.buffer, updatedTagImage.mimetype);
        updatedTagImageUrl = (await awsS3configurationService.awsGetObject(tagImgName)).split('?')[0];

      } else if (value.removeImage && existingImageUrl) {
        await awsS3configurationService.awsDeleteObject(existingImageUrl);
        updatedTagImageUrl = "";
      }

      const dataobj = {
        // ...value,
        tagname: value.tagName,
        tagimage: updatedTagImageUrl,
        modifiedby: req.user.userId,
        modifieddate: moment().format('YYYY-MM-DD H:m:s'),
      };
      const resp = await productTag.updateProductTag(productTagId, dataobj);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  deleteProductTag: async (req, res) => {
    const schema = Joi.object({
      productTagId: Joi.array().items(Joi.number().integer().min(1)).required(),
    });
    try {
      const { value, error } = schema.validate(req.body);
      if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, "") });

      const imagesToDelete = await productTag.getMultipleImagePath(value.productTagId);
      const imagePaths = imagesToDelete.map((img) => img.tagimage);

      if (imagePaths.length > 0 && process.env.ACCESS_KEYID) {
        await Promise.all(imagePaths.map((img) => awsS3configurationService.awsDeleteObject(img)));
      }

      const productTagObj = {
        isdeleted: 1,
        modifiedby: req.user.userId,
        modifieddate: moment().format('YYYY-MM-DD H:m:s'),
      }
      const resp = await productTag.deleteProductTag(value.productTagId, productTagObj);
      res.status(resp.status).json(resp);

    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  }
}