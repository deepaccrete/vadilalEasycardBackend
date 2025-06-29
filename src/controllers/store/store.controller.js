const Joi = require("joi");
const store = require("../../models/store/store.model");
const errorUtils = require("../../utils/errorHandler.utils");
const winston = require("../../config/winston");
const { nameRegex, nameRegexMsg } = require("../../utils/regex.utils.js");
const moment = require("moment");
const storeSchema = (data) => {
  const schema = Joi.object({
    companyId: Joi.number().integer().min(1).required(),
    locationId: Joi.number().integer().min(1).required(),
    posId: Joi.number().integer().min(1).required(),
    menuId: Joi.number().integer().min(1).required(),
    channelId: Joi.number().integer().min(1).required(),
    cityId: Joi.number().integer().min(1).required(),
    storeName: Joi.string().trim().regex(nameRegex()).min(2).max(50).required().messages(nameRegexMsg("Store Name")),
    contactNum: Joi.string().trim().required().messages(nameRegexMsg("Contact Number")).options({convert: true}),
    notificationContact: Joi.object({notificationNumbers: Joi.string().trim().optional().messages(nameRegexMsg("Notification Contact Number")),}).optional(),
    address: Joi.string().trim().required().messages(nameRegexMsg("Address")),
    email: Joi.string().trim().email().optional().messages(nameRegexMsg("Email")),
    pinCode: Joi.number().min(4).required().messages(nameRegexMsg("Pin Code")),
    storeDayTimeJson: Joi.array().items(
        Joi.object({
          day: Joi.string().valid("Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday").required(),
          start_time: Joi.string().required(),
          end_time: Joi.string().required(),
          isactive: Joi.number().integer().valid(0, 1).required(),
        })
      ).required(),
    activeStore: Joi.number().integer().valid(0, 1).min(1).required(),
    hideui: Joi.number().integer().valid(0, 1).min(1).optional(),
    onlineOrdering: Joi.number().integer().valid(0, 1).min(1).optional(),
    isOtpRequired: Joi.when("channelId", {
      is: 1,
      then: Joi.number().integer().valid(0, 1).min(1).required(),
      otherwise: Joi.number().integer().valid(0, 1).min(1).optional(),
    }),
    isHomeDelivery: Joi.when("channelId", {
      is: 1,
      then: Joi.number().integer().valid(0, 1).min(1).required(),
      otherwise: Joi.number().integer().valid(0, 1).min(1).optional(),
    }),
    homeDeliveryMinVal: Joi.when("isHomeDelivery", {
      is: 1,
      then: Joi.number().integer().min(1).required(),
      otherwise: Joi.alternatives().try(
        Joi.number().integer().min(0), // Allow numbers starting from 0
        Joi.allow(null) // Explicitly allow null
    ).optional(),
    }),
    isPickup: Joi.when("channelId", {
      is: 1,
      then: Joi.number().integer().valid(0, 1).min(1).required(),
      otherwise: Joi.number().integer().valid(0, 1).min(1).optional().allow(null),
    }),
    pickupMinVal: Joi.when("isPickup", {
      is: 1,
      then: Joi.number().integer().min(1).required(),
      otherwise: Joi.alternatives().try(
        Joi.number().integer().min(0), // Allow numbers starting from 0
        Joi.allow(null) // Explicitly allow null
    ).optional(),
    }),
    chargeId: Joi.when("channelId", {
      is: 1,
      then: Joi.array().items(Joi.number().integer().min(1).optional().allow(null)),
      otherwise: Joi.array().items(Joi.number().integer().min(1).optional().allow(null)),
    }),
    platformId: Joi.when("channelId", {
      is: 2,
      then: Joi.array().items(Joi.object({
        id: Joi.number().integer().min(1).required(),
        isActive: Joi.number().integer().valid(0, 1).required(),
      })),
      otherwise: Joi.array().items(Joi.object({
        id: Joi.number().integer().min(1).optional(),
        isActive: Joi.number().integer().valid(0, 1).optional(),
      })),
    }),
    enablePayLater: Joi.when("channelId", {
      is: 1,
      then: Joi.number().integer().valid(0, 1).min(1).required(),
      otherwise: Joi.number().integer().valid(0, 1).min(1).optional(),
    }),
    paymentGateAway: Joi.when("channelId", {
      is: 1,
      then: Joi.number().integer().valid(0, 1).min(1).required(),
      otherwise: Joi.number().integer().valid(0, 1).min(1).optional(),
    }),
    pgid: Joi.when("paymentGateAway", {
      is: 1,
      then: Joi.number().integer().min(1).required(),
      otherwise: Joi.number().integer().min(1).optional(),
    }),
    appid: Joi.when("paymentGateAway", {
      is: 1,
      then: Joi.string().trim().required(),
      otherwise: Joi.string().trim().optional(),
    }),
    secretkey: Joi.when("paymentGateAway", {
      is: 1,
      then: Joi.string().trim().required(),
      otherwise: Joi.string().trim().optional(),
    }),
  });
  const { value, error } = schema.validate(data);

  if (error) {
    throw errorUtils.createError(error.details[0].message.replace(/"/g, ""), 400);
  }
  return value;
};

module.exports = {
  getPosAndMenuList: async (req, res) => {
    const schema = Joi.object({
      locationId: Joi.number().integer().min(1).required(),
    });
    try {
      const { value, error } = schema.validate(req.body);
      if (error)
        return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, ""), });
      const menuList = await store.getPosAndMenuList(value.locationId);
      res.status(200).json({ success: 1, data: menuList });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },
  listStore: async (req, res) => {
    try {
      const storeList = await store.list(req);
      res.status(200).json({ success: 1, data: storeList });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },
  
  getStore: async (req, res) => {
    const storeId = req.params.id;
    try {
      const storeData = await store.getStoreData(storeId);
      res.status(200).json({ success: 1, data: storeData });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },
  addStore: async (req, res) => {
    try {
      const value = storeSchema(req.body);
      const { paymentGateAway, pgid, appid, secretkey, platformId, chargeId, ...storeData } = {
        ...value,
        notificationContact: JSON.stringify(value.notificationContact),
        storeDayTimeJson: JSON.stringify(value.storeDayTimeJson),
        createdBy: req.user.userId,
        createdDate: moment().format("YYYY-MM-DD H:m:s"),
        ipaddress: req.ip,
        isDeleted: 0,
      };
      const storeParams = { storeData, platformId, chargeId, paymentGateAway, pgid, appid, secretkey };
      const duplicateStore = await store.getData(0, value.companyId, value.storeName, false, value.channelId, value.locationId);
      if (duplicateStore.length > 0) throw errorUtils.createError(`Store Name ${value.storeName} already exists in this location`,409);
      const resp = await store.addStore(storeParams);
      res.status(resp.status).json(resp);
    } catch (error) {
      console.log(error);
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },
  updateStore: async (req, res) => {
    try {
      const storeId = req.params.id;
      const value = storeSchema(req.body);
      const { paymentGateAway, pgid, appid, secretkey, platformId, chargeId, ...storeData } = {
        ...value,
        notificationContact: JSON.stringify(value.notificationContact),
        storeDayTimeJson: JSON.stringify(value.storeDayTimeJson),
        modifiedBy: req.user.userId,
        modifiedDate: moment().format("YYYY-MM-DD H:m:s"),
        ipaddress: req.ip,
      };
      const duplicateStore = await store.getData(storeId, value.companyId, value.storeName, true, value.channelId, value.locationId);
      const existingStoreMenuId = await store.getStoreData(storeId);
      let notification = '';
      if(existingStoreMenuId.menuId != value.menuId) {
        notification = `We have Updated the Menu. Make Sure Menu from POS & Online Stores should be same.`;
      }
      if (duplicateStore.length > 0) {
        throw errorUtils.createError(`Store Name ${value.storeName} already exists`, 409);
      }
      const storeParams = { storeData, platformId, chargeId, paymentGateAway, pgid, appid, secretkey };
      const resp = await store.updateStore(storeParams, storeId);
      res.status(resp.status).json({
        ...resp,
        notification,
      });
    } catch (error) {
      winston.error(error);
      console.log(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },
  deleteStore: async (req, res) => {
    try {
      const schema = Joi.object({
        storeId: Joi.array().items(Joi.number().integer().min(1)).required(),
      });
      const { value, error } = schema.validate(req.body);
      if (error)
        return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, ""), });
      const storeData = {
        modifiedDate: moment().format("YYYY-MM-DD H:m:s"),
        modifiedBy: req.user.userId,
        ipaddress: req.ip,
        isDeleted: 1,
      };
      const resp = await store.deleteStore(storeData, value.storeId);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },
};
