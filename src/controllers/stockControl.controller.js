const Joi = require("joi");
const stockControl= require("../models/stockControl.model.js");
const winston = require("../config/winston");
const moment = require("moment");

module.exports = {

    getStockControlItem: async (req, res) => {
        const schema = Joi.object({
            companyId: Joi.number().integer().min(1).required(),
            locationId: Joi.number().integer().min(1).required(),
            productCategoryIds: Joi.array().items(Joi.number().integer()).default([]),
            productIds: Joi.array().items(Joi.number().integer()).default([]),
        });

        try {
            const { value, error } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({
                    success: 0,
                    msg: error.details[0].message.replace(/"/g, ""),
                });
            }

            const resp = await stockControl.getData(req);
            res.json({ success: 1, data: resp });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

  updateStockControlItem: async (req, res) => {
    const schema = Joi.object({
      onlineStockData: Joi.array() .items(Joi.object({
            onlineMenuId: Joi.number().integer().min(1).required(),
            stockInOut: Joi.number().valid(0, 1).required(),
          })
          .min(1)
        ).required(),
    });

    try {
      const { value, error } = schema.validate(req.body);
      if (error)
        return res.status(400).json({
          success: 0,
          msg: error.details[0].message.replace(/"/g, ""),
        });

      const updateData = {

        modifiedBy: req.user.userId,
        modifiedDate: moment().format("YYYY-MM-DD HH:mm:ss"),
        ipAddress: req.ip,
      };

      const resp = await stockControl.updateStockControlItem(updateData, value.onlineStockData);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

    getStockControlModifiers: async (req, res) => {
    const schema = Joi.object({

      companyId:Joi.number().integer().min(1).required(),
      locationId:Joi.number().integer().min(1).required(),
      modifierCategoryIds:Joi.array().items(Joi.number().integer()).default([]),
      modifierIds: Joi.array().items(Joi.number().integer()).default([]),
      });

      try {
        const { value, error } = schema.validate(req.body);
        if (error)
          return res.status(400).json({
            success: 0,
            msg: error.details[0].message.replace(/"/g, ""),
          });
        
   const resp = await stockControl.getModifiersData(req);
   res.json({ success: 1, data: resp })
 }
 catch (error) {
   winston.error(error);
   res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
 }
},

updateStockControlModifiers: async (req, res) => {
  const schema = Joi.object({
    onlineStockModifiersData: Joi.array().items(Joi.object({
          omid: Joi.number().integer().min(1).required(),
          inStock: Joi.number().valid(0, 1).required(),
        })
      )
      .min(1)
      .required(),
  });

  try {
    const { value, error } = schema.validate(req.body);
    if (error)
      return res.status(400).json({
        success: 0,
        msg: error.details[0].message.replace(/"/g, ""),
      });

    const updateData = {
      modifiedBy: req.user.userId,
      modifiedDate: moment().format("YYYY-MM-DD HH:mm:ss"),
      ipAddress: req.ip,
    };

    const resp = await stockControl.updateStockControlModifiers(updateData,value.onlineStockModifiersData);
    res.status(resp.status).json(resp);
  } catch (error) {
    winston.error(error);
    res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
  }
},

}

 