const Joi = require("joi");
const winston = require("../../config/winston.js");
const onlinemenu = require("../../models/onlinemenu/onlinemenuDetails.model.js");


module.exports = {
  getOnlineMenuDetailsList: async (req, res) => {
    try {
      const schema = Joi.object({
        menuId: Joi.number().integer().min(1).required(),
        locationId: Joi.number().integer().min(1).required(),
        channelId: Joi.number().integer().min(1).required(),
    });
    
    const { value, error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, "") });
    }
      const resp = await onlinemenu.getOnlineMenuDetailsList(req);
      return res.status(200).json({ success: 1, data: resp });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  updateOnlineMenuDetailsList: async (req, res) => {
    const schema = Joi.object({
      channelId: Joi.number().integer().min(1).required(),
      products: Joi.array().items(
          Joi.object({
            menuProductId: Joi.number().integer().min(1).required(),
            sortNumber: Joi.number().integer().min(1).required(),
            price: Joi.number().required(),
            tax: Joi.number().integer().required(),
            stockInOut: Joi.number().integer().valid(0, 1).required(),
            isRecommended: Joi.number().integer().valid(0, 1).required(),
            isChecked: Joi.number().integer().valid(0, 1).required(),
          })).min(1).required(),
    });

    const { value, error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, "") });
    }

    try {
      // Send the entire products array to the service function
      let resp= await onlinemenu.updateOnlineMenuDetailsList(value,req.user.userId,req.ip);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(500).json({ success: 0, msg: "Internal server error" });
    }
  },
};
