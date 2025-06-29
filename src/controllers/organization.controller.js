const Joi = require("joi");
const jwt = require("jsonwebtoken");
const organization = require("../models/organization.model");
const jwtUtils = require("../utils/jwtToken.utils");
const errorUtils = require("../utils/errorHandler.utils");
const winston = require("../config/winston");
const crypto = require('crypto');
const { min } = require("moment");

module.exports = {
    getMinistry: async (req, res) => {
        try {
            const getMinistry = await organization.getMinistry();
            res.status(200).json({ success: 1, data: getMinistry.data });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    getProjectUnit: async (req, res) => {
        try {
            const getProjectUnit = await organization.getProjectUnit();
            res.status(200).json({ success: 1, data: getProjectUnit.data });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    getDepartment: async (req, res) => {
        try {
            const { body, params, info } = req;
            if (!params.ministryId) return res.status(400).json({ success: 0, msg: 'Invalid Ministry' });
            if (!params.unitId) return res.status(400).json({ success: 0, msg: 'Invalid Unit' });
            const getDepartment = await organization.getDepartment(params);
            if (getDepartment.success === 0) throw errorUtils.createError(getDepartment.msg, 401);
            res.status(200).json({ success: 1, data: getDepartment.data });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },

    getDesignation: async (req, res) => {
        try {
            const { body, params, info } = req;
            if (!params.ministryId) return res.status(400).json({ success: 0, msg: 'Invalid Ministry' });
            if (!params.unitId) return res.status(400).json({ success: 0, msg: 'Invalid Unit' });
            if (!params.departmentId) return res.status(400).json({ success: 0, msg: 'Invalid Department' });
            const getDesignation = await organization.getDesignation(params);
            if (getDesignation.success === 0) throw errorUtils.createError(getDesignation.msg, 401);
            res.status(200).json({ success: 1, data: getDesignation.data });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
}