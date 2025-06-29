const Joi = require("joi");
const errorUtils = require("../utils/errorHandler.utils");
const pos = require("../models/pos.model.js");
const winston = require("../config/winston");
const moment = require("moment");
const { nameRegex, nameRegexMsg } = require("../utils/regex.utils");


const posSchema = (data, isUpdate, roleId) => {
  const schema = Joi.object({

    companyId: Joi.number().integer().min(1).required(),
    posName: Joi.string().trim().regex(nameRegex()).min(2).max(50).required().messages(nameRegexMsg('Pos Name')),
    locationId: Joi.number().integer().min(1).required(),
    defaultMenuId: Joi.number().integer().min(1).required(),
    invoiceMsg: Joi.string().trim().regex(nameRegex()).min(2).max(50).required().messages(nameRegexMsg('Invoice Messages')),
    isActive: Joi.number().valid(0, 1).required(),

    mysqlPass: Joi.when('$isUpdate', {
      is: false,
      then: Joi.string().allow('').optional(),
      otherwise: Joi.forbidden(),
    }),
    posMappingMenu: Joi.when('$roleId', {
      is: 0,
      then: Joi.array().items(Joi.number().integer().min(1).max(6)).required(),
      otherwise: Joi.forbidden(),
    }),
   posOptions: Joi.object({
      displayscreen: Joi.number().integer().valid(1, 2, 3).required(),
      touchscreen: Joi.number().integer().valid(0, 1).required(),
      showcashbal: Joi.number().integer().valid(0, 1).required(),
      cashnote: Joi.number().integer().valid(0, 1).required(),
      dayposallow: Joi.number().integer().valid(0, 1).required(),
      itemwisesalesreport: Joi.number().integer().valid(0, 1).required(),
      categorywisereport: Joi.number().integer().valid(0, 1).required(),
      billsummaryreports: Joi.number().integer().valid(0, 1).required(),
      customerselc: Joi.number().integer().valid(0, 1).required(),
      discompulsry: Joi.number().integer().valid(0, 1).required(),
      isfreeofcostbtnenabled: Joi.number().integer().valid(0, 1).required(),
      cashdifference: Joi.number().integer().valid(0, 1).required(),
      editsaveorders: Joi.number().integer().valid(0, 1).required(),
      canceledkotprint: Joi.number().integer().valid(0, 1).required(),
      sendkotprintonbiller: Joi.number().integer().valid(0, 1).required(),
      companynameonbill: Joi.number().integer().valid(0, 1).required(),
      mergeitemqtybillkot: Joi.number().integer().valid(0, 1).required(),
      zomatointgrtion: Joi.number().integer().valid(0, 1).required(),
      amounttoqty: Joi.number().integer().valid(0, 1).required(),
      iscashsettlebtnenabled: Joi.number().integer().valid(0, 1).required(),
      defaultprintqty: Joi.number().integer().min(0).required(),
      kotprintqty: Joi.number().integer().min(0).required(),
      maxbillprintqty: Joi.number().integer().min(0).max(100).required(),
      maxkotprintqty: Joi.number().integer().min(0).max(100).required(),
      maxdiscount: Joi.number().integer().min(0).max(100).required(),
      printwithoutsettlement: Joi.number().integer().valid(0, 1).required(),
      kotprint: Joi.number().integer().valid(0, 1).required(),
      reasonforbillprint: Joi.number().integer().valid(0, 1).required(),
      logoprint: Joi.number().integer().valid(0, 1).required(),
      portionprint: Joi.number().integer().valid(0, 1).required(),
      complimentoryordersreason: Joi.number().integer().valid(0, 1).required(),
      totalwoutroundoff: Joi.number().integer().valid(0, 1).required(),

      allowedordertypeprint: Joi.string().trim().min(1).required(),
      allowedpaymenttypeprint: Joi.string().trim().min(1).required(),
      allowedordertypekot: Joi.string().trim().min(1).required(),
      allowedpaymenttypekot: Joi.string().trim().min(1).required(),

    }).required(),
  });

  const { value, error } = schema.validate(data, { context: { isUpdate, roleId} });
  if (error) throw errorUtils.createError(error.details[0].message.replace(/"/g, ''), 400);
  return value;
}


module.exports = {
  getPosList: async (req, res) => {
    const companyId = req.body.companyId;
    if (!companyId) return res.status(400).json({ success: 0, msg: 'Invalid Company' })
    try {
      const posList = await pos.getPosList(req);
      res.status(200).json({ success: 1, data: posList });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  getPosData: async (req, res) => {
    const posId = req.params.posId;
    const companyId = req.body.companyId;
    if (!companyId) return res.status(400).json({ success: 0, msg: 'Invalid Company' })

    try {
      if (!posId > 0) return res.status(400).json({ success: 0, msg: 'Invalid POS ID' });

      const resp = await pos.getData(posId, companyId, null, null, req.user.roleId);
      res.json({ success: 1, data: resp })
    }
    catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

createPos: async (req, res) => {
  try {
    const value = posSchema(req.body, false, req.user.roleId);

    const getDuplicatepos = await pos.getData(0, value.companyId, value.posName);
    if (getDuplicatepos?.length > 0) throw errorUtils.createError(`POS name is already exists on that Location`, 409);

    function generatePosUniqueKey(n) {
      const characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let randomString = '';

      for (let i = 0; i < n; i++) {
        const index = Math.floor(Math.random() * characters.length);
        randomString += characters[index];
      }

      return randomString;
    }

    let mysqlpass = '';
    if (req.user.roleId !== 0) {
      mysqlpass = 'M@rut!Accr3T3';
    } else {
      mysqlpass = value.mysqlPass;
    }

    const posuniquekey = generatePosUniqueKey(30);

    const { posMappingMenu, ...rest } = req.body;

    const posData = {
      ...rest,
      mysqlPass: mysqlpass,
      isRegistered: 0,
      posuniquekey: posuniquekey,
      posOptions: JSON.stringify(value.posOptions),
      createdby: req.user.userId,
      createddate: moment().format('YYYY-MM-DD H:m:s'),
      ipaddress: req.ip,
    };

    const resp = await pos.createPos(posData, posMappingMenu, req.user.roleId);
    res.status(resp.status).json(resp);
  } catch (error) {
    winston.error(error);
    res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
  }
},
  
  updatePos: async (req, res) => {
    const posId = req.params.posId;

    try {
      const value = posSchema(req.body, true);
      if (!posId > 0) throw errorUtils.createError('Invalid POS ID', 400);

      const getDuplicatePos = await pos.getData(posId, value.companyId, value.posName, true);
      if (getDuplicatePos?.length > 0) throw errorUtils.createError(` POS name is Already exists on that Location`, 409);

      let mysqlpass = '';
      if (req.user.roleId !== 0) {
        mysqlpass = 'M@rut!Accr3T3';
      } else {
        mysqlpass = value.mysqlPass;
      }

      const updateData = {
        ...value,
        mysqlPass: mysqlpass,
        posOptions: JSON.stringify(value.posOptions),
        modifiedBy: req.user.userId,
        modifiedDate: moment().format('YYYY-MM-DD H:m:s'),
        ipaddress: req.ip
      };

      const resp = await pos.updatePos(posId, updateData);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  deletePos: async (req, res) => {
    const schema = Joi.object({
      posId: Joi.array().items(Joi.number().integer().min(1)).required(),
    });
    try {
      const { value, error } = schema.validate(req.body);
      if (error)
        return res.status(400).json({
          success: 0,
          msg: error.details[0].message.replace(/"/g, ""),
        });
      const posObj = {
        isdeleted: 1,
        modifiedBy: req.user.userId,
        modifieDdate: moment().format('YYYY-MM-DD H:m:s'),
        ipAddress: req.ip
      }
      const resp = await pos.deletePos(value.posId, posObj);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  getPaymentType: async (req, res) => {
    const companyId = req.body.companyId;

    try {
      const posData = await pos.getPaymentType(companyId);
      res.status(200).json({ success: 1, data: posData });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  getOrderType: async (req, res) => {
    const companyId = req.body.companyId;

    try {
      const posData = await pos.getOrderType(companyId);
      res.status(200).json({ success: 1, data: posData });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

}
