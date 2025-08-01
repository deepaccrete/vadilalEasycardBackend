const dashboardModel = require("../models/dashboard.model");
const winston = require("../config/winston");
const moment = require("moment");

module.exports = {
    getDashboardAnalytics: async (req, res) => {
        try {
            const dashboardData = await dashboardModel.getDashboardAnalytics(req.info);
            if(dashboardData.success != 1){
                return res.status(dashboardData.success).json({success:0, msg:dashboardData.msg});
            } 
            res.status(200).json({ success: 1, data: dashboardData.data });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    }
};