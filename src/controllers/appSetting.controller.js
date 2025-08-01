const appsettingmodel = require("../models/appSetting.model");
const winston = require("../config/winston");
const moment = require("moment");

module.exports = {
    setAppSettings: async (req, res) => {
  try {
    const {
      isadd,
      isdeletecard,
      isedit,
      isshare,
      isaddgroup,
      isaddtag
    } = req.body;

    // Validate required fields
    if (
      isadd === undefined || isdeletecard === undefined || isedit === undefined ||
      isshare === undefined || isaddgroup === undefined || isaddtag === undefined
    ) {
      return res.status(400).json({ success: 0, msg: "All setting fields are required" });
    }

    const result = await appsettingmodel.setAppSettings({
      isadd,
      isdeletecard,
      isedit,
      isshare,
      isaddgroup,
      isaddtag
    }, req.info);

    if (result.success !== 1) {
      throw new Error(result.msg);
    }

    res.status(200).json({ success: 1, msg: "App settings updated successfully" });

  } catch (error) {
    winston.error(error);
    res.status(500).json({ success: 0, msg: error.message });
  }
},
getAppSettings: async (req, res) => {
  try {
    const result = await appsettingmodel.getAppSettings();

    if (result.success !== 1) {
      throw new Error(result.msg);
    }

    res.status(200).json({ success: 1, data: result.data });
  } catch (error) {
    winston.error(error);
    res.status(500).json({ success: 0, msg: error.message });
  }
}


};