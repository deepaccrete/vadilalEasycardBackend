const modifier = require("../../models/product/productModifier.model.js");
const Joi = require("joi");
const winston = require("../../config/winston.js");
const moment = require("moment");

module.exports = {
  addProductModifier: async (req, res) => {

    // Define validation schema
    const schema = Joi.object({
      companyId: Joi.number().integer().min(1).required(),
      productPortionIds: Joi.array().items(Joi.object({ productId: Joi.number().integer().min(1).required(), productPortionId: Joi.number().integer().min(1).required() })).required(),
      modifierIds: Joi.array().items(Joi.number().integer().min(1)).required(),
      defaultModifierIds: Joi.array().items(Joi.number().integer().min(1)).default([]), // Default to empty array
      menuIds: Joi.array().items(Joi.number().integer().min(1)),
    });

    const { value, error } = schema.validate(req.body);
    try {
      if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, ""), });
      const resp = await modifier.addProductModifier(value, req.ip, req.user.userId);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  getProductModifierList: async (req, res) => {
    try {
      const data = req.body;
      if (!data.companyId || data.companyId === 0) throw errorUtils.createError('Invalid Company', 400);
      const resp = await modifier.getProductModifierList(req);
      return res.status(200).json({ success: 1, data: resp });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },


  deleteProductModifiers: async (req, res) => {
    try {
      const schema = Joi.object({
        productModifierId: Joi.array().items(Joi.number().integer().min(1)).required(),
      });
      const { value, error } = schema.validate(req.body);
      if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });

      const updateData = {
        modifiedby: req.user.userId,
        modifieddate: moment().format('YYYY-MM-DD H:m:s'),
        ipaddress: req.ip,
        isdeleted: 1
      }

      const resp = await modifier.deleteProductModifier(value.productModifierId, updateData);
      res.status(resp.status).json(resp);

    } catch (error) {
      winston.error(error);
      return res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  getModifierWithCategoryDropdown: async (req, res) => {
    try {
      const schema = Joi.object({
        companyId: Joi.number().integer().min(1).required(),
      });
      const { value, error } = schema.validate(req.body);
      if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, '') });
      const resp = await modifier.getModifierWithCategoryDropdown(value.companyId);
      res.status(200).json({ success: 1, data: resp });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

};
