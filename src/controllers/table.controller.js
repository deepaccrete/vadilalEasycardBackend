const Joi = require("joi");
const table = require("../models/tabel.model.js");
const errorUtils = require("../utils/errorHandler.utils");
const winston = require("../config/winston");
const moment = require("moment");

const tableSchema = (data) => {
  const schema = Joi.object({
    companyId: Joi.number().integer().min(1).required(),
    tableName: Joi.string().trim().min(1).required(),
    locationId: Joi.number().integer().min(1).required(),
    isActive: Joi.number().valid(0, 1).required()
  });
  const { value, error } = schema.validate(data);
  if (error) throw errorUtils.createError(error.details[0].message.replace(/"/g, ''), 400);
  return value;
}


module.exports = {
  getTableList: async (req, res) => {
    try {
      const getTableList = await table.getTableList(req);
      res.status(200).json({ success: 1, data: getTableList });
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  getTableData: async (req, res) => {
    const tableId = req.params.tableId;
    try {
      if (!tableId > 0) return res.status(400).json({ success: 0, msg: 'Invalid Table' });

      const resp = await table.getData(tableId);
      res.json({ success: 1, data: resp })
    }
    catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  createTable: async (req, res) => {
    try {
      const value = tableSchema(req.body);

      const getDuplicateTable = await table.getData(0, value.locationId, value.tableName);
      if (getDuplicateTable?.length > 0) throw errorUtils.createError(`Table ${value.tableName} is Already exists`, 409);

      const tableData = {
        ...value,
        createdby: req.user.userId,
        createddate: moment().format('YYYY-MM-DD H:m:s'),
        ipaddress: req.ip
      };

      const resp = await table.createTable(tableData)
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  updateTable: async (req, res) => {
    const tableId = req.params.id;

    try {
      const value = tableSchema(req.body);
      if (!tableId > 0) throw errorUtils.createError('Invalid Table', 400);

      const getDuplicateTable = await table.getData(tableId, value.locationId, value.tableName, true);
      if (getDuplicateTable?.length > 0) throw errorUtils.createError(`Table ${value.tableName} is Already exists`, 409);

      const dataobj = {
        ...value,
        modifiedby: req.user.userId,
        modifieddate: moment().format('YYYY-MM-DD H:m:s'),
        ipaddress: req.ip
      };
      const resp = await table.updateTable(tableId, dataobj);
      res.status(resp.status).json(resp);
    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  },

  deleteTable: async (req, res) => {
    const schema = Joi.object({
      tableId: Joi.array().items(Joi.number().integer().min(1)).required(),
    });
    try {
      const { value, error } = schema.validate(req.body);
      if (error) return res.status(400).json({ success: 0, msg: error.details[0].message.replace(/"/g, "") });

      const tableObj = {
        isdeleted: 1,
        modifiedby: req.user.userId,
        modifieddate: moment().format('YYYY-MM-DD H:m:s'),
        ipaddress: req.ip
      }
      const resp = await table.deleteTable(value.tableId, tableObj);
      res.status(resp.status).json(resp);

    } catch (error) {
      winston.error(error);
      res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    }
  }
}