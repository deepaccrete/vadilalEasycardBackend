const Joi = require("joi");
const errorUtils = require("../utils/errorHandler.utils");
const tax = require("../models/tax.model");
const winston = require("../config/winston.js");

module.exports = {
    getTaxProfileList: async (req, res) => {
        try {
            const getTax = await tax.getTaxProfile(req);
            res.status(200).json({ success: 1, data: getTax });
        } catch (error) {
            console.error(error);
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    }

}