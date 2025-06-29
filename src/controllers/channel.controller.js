const Joi = require("joi");
const errorUtils = require("../utils/errorHandler.utils");
const channel = require("../models/channel.model.js");
const winston = require("../config/winston");
const moment = require("moment");
const { nameRegex, nameRegexMsg } = require("../utils/regex.utils");

const channelSchema = (data) => {
  const schema = Joi.object({
    channelName: Joi.string().trim().regex(nameRegex()).min(2).max(50).required().messages(nameRegexMsg('Channel Name')),
    channelGroupId: Joi.number().integer().min(1).required(),
    secretkey: Joi.string().trim().min(0),
    secretvalue: Joi.number().integer().min(0).allow(null).empty(''),
    tokenurl: Joi.string().trim().min(0),
    storeaddupdateurl: Joi.string().trim().min(0),
    storeaction: Joi.string().trim().min(0),
    menuaddupdate: Joi.string().trim().min(0),
    itemaction: Joi.string().trim().min(0),
    orderstatusupdate: Joi.string().trim().min(0),
    rideraddupdate: Joi.string().trim().min(0),
    riderassign: Joi.string().trim().min(0)
  });
  const { value, error } = schema.validate(data);
  if (error) throw errorUtils.createError(error.details[0].message.replace(/"/g, ''), 400);
  return value;
}

module.exports = {
  getChannelList: async (req, res) => {
    try {
      const channelList = await channel.getChannelList(req);
      res.status(200).json({ success: 1, data: channelList });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  getChannelData: async (req, res) => {
    const channelId = req.params.channelId;

    try {
      if (!channelId) return res.status(400).json({ success: 0, msg: 'Invalid Channel' });

      const resp = await channel.getData(channelId);
      res.json({ success: 1, data: resp })
    }
    catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  createChannel: async (req, res) => {

    try {
      const value = channelSchema(req.body);

      const getDuplicateChannel = await channel.getData(0, value.channelName);
      if (getDuplicateChannel?.length > 0) throw errorUtils.createError(`Channel ${value.channelName} is Already exists`, 409);

      const channelData = {
        ...value,
        createdby: req.user.userId,
        createddate: moment().format('YYYY-MM-DD H:m:s'),
        ipaddress: req.ip
      };

      const resp = await channel.createChannel(channelData);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  updateChannel: async (req, res) => {
    const channelId = req.params.channelId;

    try {
      const value = channelSchema(req.body);
      if (!channelId > 0) throw errorUtils.createError('Invalid Channel', 400);

      const getDuplicateChannel = await channel.getData(channelId, value.channelName, true);
      if (getDuplicateChannel?.length > 0) throw errorUtils.createError(`Channel ${value.channelName} is Already exists`, 409);

      const updateData = {
        ...value,
        modifiedby: req.user.userId,
        modifieddate: moment().format('YYYY-MM-DD H:m:s'),
        ipaddress: req.ip
      };

      const resp = await channel.updateChannel(channelId, updateData);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  deleteChannel: async (req, res) => {
    const channelId = req.params.channelId;
    try {
      if (!channelId > 0) return res.status(400).json({ success: 0, msg: 'Invalid Channel' });

      const channelObj = {
        isdeleted: 1,
        modifiedby: req.user.userId,
        modifieddate: moment().format('YYYY-MM-DD H:m:s'),
        ipaddress: req.ip
      }
      const resp = await channel.deleteChannel(channelId, channelObj);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  channelComapanyMapping: async (req, res) => {
    const { channelId, companyId } = req.body;
    const schema = Joi.object({
      channelId: Joi.number().required(),
      companyId: Joi.array()
        .items(Joi.number().integer().min(1))
        .required(),
    });
    const { value, error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: 0,
        msg: error.details[0].message.replace(/"/g, ""),
      });
    }
    try {
      const checkChannelCompanyMapping = await channel.checkChannelCompanyMapping(channelId, companyId);
      if (checkChannelCompanyMapping?.success === 0) {
        return res.status(400).json({ success: 0, msg: checkChannelCompanyMapping.msg });
      }
      const newMappings = checkChannelCompanyMapping;
      if (newMappings?.length > 0) {
        const data = newMappings.map(id => [channelId, id]);

        const channelCompanyMapping = await channel.channelComapanyMapping(data);
        res.status(200).json({ success: 1, data: channelCompanyMapping });
      } else {
        res.status(200).json({ success: 1, msg: 'No new mappings to insert' });
      }

    } catch (error) {
      console.log("ERROR", error);
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  getChannelGroup: async (req, res) => {
    try {
      const resp = await channel.getChannelGroup();
      res.status(200).json({ success: 1, data: resp })
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  }
}
