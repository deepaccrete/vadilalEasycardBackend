const Joi = require("joi");
const errorUtils = require("../utils/errorHandler.utils");
const delivery = require("../models/deliveryCharge.model.js");
const winston = require("../config/winston");
const moment = require("moment");

const deliverySchema = (data, isUpdate) => {
  const schema = Joi.object({

    companyId: Joi.number().integer().min(1).required(),
    locationIds: Joi.when('$isUpdate', {
      is: true,
      then: Joi.forbidden().messages({'any.unknown': 'Editing locationId is not allowed.',}),
      otherwise: Joi.array().items(Joi.number().integer()).required(),
    }),
    taxProfileId: Joi.number().integer().min(1).required(),
    deliveryRadius: Joi.number().min(1).required(),
    chargeJson: Joi.array().items(Joi.object({
      endkm: Joi.number().min(1).required(),
      appyas: Joi.string().valid("fixed", "perkm").required(),
      charge: Joi.number().min(0).required(),
      startkm: Joi.number().min(0).required(),
    })).required(),
  })
  const { value, error } = schema.validate(data,{ context: { isUpdate} });
  if (error) throw errorUtils.createError(error.details[0].message.replace(/"/g, ''), 400);
  return value;
}

module.exports = {
  getDeliveryChargeList: async (req, res) => {
    try {
      const deliveryList = await delivery.getDeliveryChargeList(req);
      res.status(200).json({ success: 1, data: deliveryList });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  getDeliveryChargeData: async (req, res) => {
    const deliveryId = req.params.deliveryId;

    try {
      if (!deliveryId > 0) return res.status(400).json({ success: 0, msg: 'Invalid Delivery Charge' });

      const resp = await delivery.getData(deliveryId);
      res.json({ success: 1, data: resp })
    }
    catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  createDeliveryCharge: async (req, res) => {

    try {
      const value = deliverySchema(req.body,false);
      
      const getDuplicateCharge = await delivery.getData(0, value.locationIds,false);
      if (getDuplicateCharge?.length > 0) throw errorUtils.createError(`Delivery Charge is already exists on that Location`, 409);
      const deliveryData = {
        ...value,
        chargeJson: JSON.stringify(value.chargeJson),
        createdby: req.user.userId,
        createddate: moment().format('YYYY-MM-DD H:m:s'),
        ipaddress: req.ip
      };

      const resp = await delivery.createDeliveryCharge(deliveryData);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },  

  updateDeliveryCharge: async (req, res) => {
    const deliveryId = req.params.deliveryId;

    try {
      const value = deliverySchema(req.body, true); 
      if (!deliveryId > 0) throw errorUtils.createError('Invalid Delivery', 400);

      const updateData = {
        ...value,
        chargeJson: JSON.stringify(value.chargeJson),
        modifiedby: req.user.userId,
        modifieddate: moment().format('YYYY-MM-DD H:m:s'),
        ipaddress: req.ip
      };

      const resp = await delivery.updateDeliveryCharge(deliveryId, updateData);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },


  deleteDeliveryCharge: async (req, res) => {
    const schema = Joi.object({
      deliveryId: Joi.array().items(Joi.number().integer().min(1)).required(),
    });
    try {
      const { value, error } = schema.validate(req.body);
      if (error)
        return res.status(400).json({
          success: 0,
          msg: error.details[0].message.replace(/"/g, ""),
        });
      const deliveryObj = {
        isdeleted: 1,
        modifiedby: req.user.userId,
        modifieddate: moment().format('YYYY-MM-DD H:m:s'),
        ipaddress: req.ip
      }
      const resp = await delivery.deleteDeliveryCharge(value.deliveryId, deliveryObj);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  }
}


