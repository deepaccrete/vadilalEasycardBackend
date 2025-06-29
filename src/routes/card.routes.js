const express = require("express");
const multer = require('multer');
const { jwtMiddleware } = require("../middlewares/auth.middleware");
const cardcontroller = require("../controllers/card.controller.js");
const { refreshAccessToken } = require("../utils/jwtToken.utils");
const router = express.Router();

// Configure multer to use memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});


router.post('/uploadcard',jwtMiddleware,upload.array('images', 2),cardcontroller.uploadImagesBase65 )
router.post('/getcardlists',jwtMiddleware,cardcontroller.getcardlists);


module.exports = {
    path: '/card',
    router: router
};
