const Joi = require("joi");
const jwt = require("jsonwebtoken");
const geoLocation = require("../models/geoLocation.model");
const jwtUtils = require("../utils/jwtToken.utils");
const errorUtils = require("../utils/errorHandler.utils");
const winston = require("../config/winston");
const crypto = require('crypto');
const { min } = require("moment");

module.exports = {
    getRegion : async (req, res) => {
        try {
            const getRegion = await geoLocation.getRegion();
            res.status(200).json({ success: 1, data: getRegion.data });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
}