const Joi = require("joi");
const errorUtils = require("../utils/errorHandler.utils");
const charge = require("../models/charge.model.js");
const winston = require("../config/winston");
const moment = require("moment");
const { nameRegex, nameRegexMsg } = require("../utils/regex.utils");

const chargeSchema = (data) => {
  const schema = Joi.object({
    companyId: Joi.number().integer().min(1).required(),
    locationId: Joi.number().integer().min(1).required(),
    menuId: Joi.number().integer().min(1).required(),
    productJson: Joi.array().items(Joi.number().integer()).required(),
    chargeName: Joi.string().trim().regex(nameRegex()).min(2).max(50).required().messages(nameRegexMsg('Charge Name')),
    chargeValue: Joi.number().min(0).required(),
    fulfillmentModesJson: Joi.array().items(Joi.number().integer()).required(),  // 1-Delivery, 2-Pickup
    isActive: Joi.number().valid(0, 1).required(),
    description: Joi.string().trim().min(1),
    applicableOn: Joi.number().integer().valid(0, 1, 2),
  });
  const { value, error } = schema.validate(data);
  if (error) throw errorUtils.createError(error.details[0].message.replace(/"/g, ''), 400);

  return value;
}

module.exports = {
  getChargeList: async (req, res) => {
    try {
      const chargeList = await charge.getChargeList(req);
      res.status(200).json({ success: 1, data: chargeList });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  getChargeData: async (req, res) => {
    // const chargeId = req.params.chargeId;
    const chargeId = parseInt(req.params.chargeId, 10);
    try {
      if (!chargeId > 0) return res.status(400).json({ success: 0, msg: 'Invalid Charge' });

      const resp = await charge.getData(chargeId);
      res.json({ success: 1, data: resp })
    }
    catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  createCharge: async (req, res) => {

    try {
      const value = chargeSchema(req.body);    
   
      const getDuplicateCharge = await charge.getData(0, value.locationId, value.menuId);
      if (getDuplicateCharge?.length > 0) throw errorUtils.createError(`Charge Is Already Exists On that Menu`, 409);

      const chargeData = {
        ...value,
        fulfillmentModesJson: value.fulfillmentModesJson.join(','),
        productJson: value.productJson.join(','),
        chargeType: 1,  // 1-Fixed
        isChargeFor: 2, //1-Delivery, 2-Packaging charge
        dateKey: moment().format('YYYYMMDD'),
        createdby: req.user.userId,
        createddate: moment().format('YYYY-MM-DD H:m:s'),
        ipaddress: req.ip
      };

      const resp = await charge.createCharge(chargeData);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  updateCharge: async (req, res) => {
    const chargeId = req.params.chargeId;

    try {
      const value = chargeSchema(req.body);
      const getDuplicateCharge = await charge.getData(chargeId, value.locationId, value.menuId, true);
      if (getDuplicateCharge?.length > 0) throw errorUtils.createError(`Charge is Already Exists on that Menu`, 409);

      const updateData = {
        ...value,
        fulfillmentModesJson: value.fulfillmentModesJson.join(','),
        productJson: value.productJson.join(','),
        modifiedby: req.user.userId,
        modifieddate: moment().format('YYYY-MM-DD H:m:s'),
        ipaddress: req.ip
      };

      const resp = await charge.updateCharge(chargeId, updateData);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  deleteCharge: async (req, res) => {
    const schema = Joi.object({
      chargeId: Joi.array().items(Joi.number().integer().min(1)).required(),
    });
    try {
      const { value, error } = schema.validate(req.body);
      if (error)
        return res.status(400).json({
          success: 0,
          msg: error.details[0].message.replace(/"/g, ""),
        });

      const chargeObj = {
        isdeleted: 1,
        modifiedby: req.user.userId,
        modifieddate: moment().format('YYYY-MM-DD H:m:s'),
        ipaddress: req.ip
      }
      const resp = await charge.deleteCharge(value.chargeId, chargeObj);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  getProductsWithCharge: async (req, res) => {
      const schema = Joi.object({
        locationId: Joi.required(),
        menuId: Joi.required(),
        chargeId: Joi.required(),
        companyId: Joi.required()
      });

        try {
            const { value, error } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: 0,
                    msg: error.details[0].message.replace(/"/g, ""),
                });
            }

            const resp = await charge.getProductsWithCharge(value.locationId, value.menuId, value.chargeId, value.companyId);
            res.json({ success: 1, data: resp });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

}
