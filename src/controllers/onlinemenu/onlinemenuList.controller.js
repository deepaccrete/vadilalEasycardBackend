const Joi = require("joi");
const winston = require("../../config/winston.js");
const onlinemenu = require("../../models/onlinemenu/onlinemenuList.model.js");

module.exports={
    getOnlineMenuList: async (req, res) => {
        try {
            const schema = Joi.object({
                companyId: Joi.number().integer().min(1).required(),
                locationIds: Joi.array().items(Joi.number().integer().min(1)).min(1).required(),
            });
    
            const { value, error } = schema.validate(req.body);
            if (error) {
                return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, "") });
            }
    
            const resp = await onlinemenu.getOnlineMenuList(req);
    
            return res.status(200).json({ success: 1, data: resp });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },


    updateOnlineMenuList: async (req, res) => {
      const schema = Joi.object({
          companyId: Joi.number().integer().min(1).required(),
          locationId:Joi.number().integer().min(1).required(),
          activeStore: Joi.number().integer().valid(0, 1).required(),
      });
  
      const { value, error } = schema.validate(req.body);
      if (error) {
          return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, "") });
      }
  
        try {
            let resp = await onlinemenu.updateOnlineMenuList(value, req.user.userId,req.ip);
            res.status(resp.status).json(resp);
      } catch (error) {
            winston.error(error);
            res.status(500).json({ success: 0, msg: "Internal server error" });
      }
  },
}