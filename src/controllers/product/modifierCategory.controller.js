const errorUtils = require("../../utils/errorHandler.utils.js");
const winston = require("../../config/winston.js");
const modifierCategory = require("../../models/product/modifierCategory.model.js");
const Joi = require("joi");
const moment = require("moment");
const { nameRegex, nameRegexMsg } = require("../../utils/regex.utils.js");

const modifierCategorySchema = (data) => {
  const schema = Joi.object({
    companyId: Joi.number().integer().min(1).required(),
      modifierCategoryName: Joi.string().trim().regex(nameRegex()).min(2).max(50).required().messages(nameRegexMsg('Modifiercategory Name')),
      displayOrder: Joi.number().integer().min(1).required(),
      minimumSelection: Joi.number().integer().required(),
      maximumSelection: Joi.number().integer().required(),
      isFreeTagging: Joi.number().integer().valid(0, 1).min(1).required(),
      selectionMandatory: Joi.number().integer().valid(0, 1).min(1).required(),
  });   
   const { value, error } = schema.validate(data);
  if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });
  return value;
}
 
module.exports = {
  addModifierCategory: async (req, res) => {
    try {
    const value = modifierCategorySchema(req.body);
      const getDuplicateModifierCategory =
        await modifierCategory.getData(
          0,
          value.companyId,
          value.modifierCategoryName
        );
      if (getDuplicateModifierCategory?.length > 0)
        throw errorUtils.createError(
          `Modifier Category ${value.modifierCategoryName} is Already exists`,
          409
        );
      const modifierCategoryData = {
        ...value,
        createdBy: req.user.userId,
        companyId: value.companyId,
        ipaddress: req.ip,
      };
      const resp = await modifierCategory.createModifiercategory(
        modifierCategoryData
      );
      res.status(201).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },
  getModifierCategorydata: async (req, res) => {
    const id = req.params.id;
    try {
      const resp = await modifierCategory.getData(id);
      res.status(200).json({ success: 1, data: resp });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },
  getModifierCategoryList: async (req, res) => {
    const schema = Joi.object({
      companyId: Joi.number().integer().min(1).required(),
    });
    const { value, error } = schema.validate(req.body);
    try {
      if (error)
        return res.status(400).json({
          success: 0,
          msg: error.details[0].message.replace(/"/g, ""),
        });
      const resp = await modifierCategory.getModifierCategoryList(req);
      res.status(200).json({ success: 1, data: resp , msg: "Modifier Category List Fetched Successfully" });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },
  updateModifierCategory: async (req, res) => {
    try {
      const id = req.params.id;
      const value = modifierCategorySchema(req.body);
      const getModifierCategory =
        await modifierCategory.getData(
          id,
          value.companyId,
          value.modifierCategoryName,
          true
        );
      if (getModifierCategory?.length > 0)
        throw errorUtils.createError(
          `Modifier Category ${value.modifierCategoryName} is Already exists`,
          409
        );
      const dataobj = {
        ...value,
        modifiedBy: req.user.userId,
        modifiedDate: moment().format("YYYY-MM-DD H:m:s"),
        ipaddress: req.ip,
        companyId: value.companyId
      };
      const resp = await modifierCategory.updateModifierCategory(
        dataobj,
        id
      );
      res.status(resp.status).json(resp);
    } catch (error) {
      console.log(error)
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },
  deleteModifierCategory: async (req, res) => {
    const schema = Joi.object({
      modifierCategoryId: Joi.array().items(Joi.number().integer().min(1)).required(),
    });
    try {
      const { value, error } = schema.validate(req.body);
      if (error)
        return res.status(400).json({
          success: 0,
          msg: error.details[0].message.replace(/"/g, ""),
        });
      const dataobj = {
        modifiedBy: req.user.userId,       
        modifiedDate: moment().format("YYYY-MM-DD H:m:s"),
        modifierCategoryId: value.modifierCategoryId,
      }
        const resp = await modifierCategory.deleteModifierCategory(
        dataobj
      );
      res.status(resp.status).json(resp);

    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },
};
