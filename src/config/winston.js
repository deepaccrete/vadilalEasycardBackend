var winston = require('winston');
var fs = require("fs");
var moment = require("moment");
require('winston-daily-rotate-file');
const date = moment();
var createdDate = date.format('YYYY_MM_DD')
var options = {
	file: {
		level: 'info',
		filename: `c://Manu_Management_Logs/logs/app_${createdDate}.log`,
		handleExceptions: true,
		json: true,
		maxsize: 5242880, // 5MB
		maxFiles: 5,
		colorize: false,
		maxFiles: "14d" // keep logs for 14 days
	},
	errorFile: {
		level: 'warn',
		filename: `c://Manu_Management_Logs/logs/error_${createdDate}.log`,
		handleExceptions: true,
		json: true,
		maxsize: 5242880, // 5MB
		maxFiles: 5,
		colorize: false,
		maxFiles: "14d" // keep logs for 14 days
	}
};
var logger = winston.createLogger({
	transports: [
		new winston.transports.File(options.file),
		new winston.transports.File(options.errorFile),
	],
	exitOnError: false, // do not exit on handled exceptions
});

logger.stream = {
	write: function (message, encoding) {
		logger.info(message);
	},
};
module.exports = logger;
