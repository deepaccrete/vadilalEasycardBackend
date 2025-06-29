const Joi = require("joi");
const cardmodel = require("../models/card.model");
const extractBusinessCardInfo = require("../config/dataextraction");
const winston = require("../config/winston");
const s3 = require("../config/s3");
const moment = require("moment");
const fs = require('fs');
const path = require('path');

function formatTimestamp() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${dd}${mm}${yyyy}_${hh}${ss}`;
}

module.exports = {
    // uploadImages: async (req, res) => {

    //     try {
    //         const files = req.files;
    //         if (files.length === 0) return res.status(400).json({ success: false, message: 'No Files Found' });
    //         const timestamp = formatTimestamp();
    //         const imageUrls = [];

    //         for (let i = 0; i < files.length; i++) {
    //             const ext = path.extname(files[i].originalname);
    //             const filename = `${req.info.userid}_${timestamp}_${i + 1}${ext}`;

    //             const params = {
    //                 Bucket: process.env.S3_BUCKET_NAME,
    //                 Key: filename,
    //                 Body: files[i].buffer,
    //                 ContentType: files[i].mimetype,
    //                 ACL: 'public-read',
    //             };

    //             const s3Res = await s3.upload(params).promise();
    //             imageUrls.push(s3Res.Location);
    //         }







    //         const getRegion = await groupmodel.insertgroup(req.body, req.info);
    //         res.status(200).json({ success: 1, data: getRegion.data });
    //     } catch (error) {
    //         winston.error(error);
    //         res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
    //     }
    // },



    uploadImagesBase65: async (req, res) => {
        try {
            const files = req.files;
            if (files.length === 0) {
                return res.status(400).json({ success: false, message: 'Images Missing' });
            }

            const base64Images = files.map(file => {
                return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
            });

            //-------------------------------------------------------------------------------------------
            //Image base64 to .txt file 

            // const base64Data = base64Images.join('\n\n');

            // // Define the path to store the text file
            // const filePath = path.join(__dirname, 'base64_images'+formatTimestamp()+'.txt');
            // console.log("------------", __dirname);
            // fs.writeFile(filePath, base64Data, (err) => {
            //     if (err) {
            //         console.error('Error writing Base64 to file:', err);
            //     } else {
            //         console.log('Base64 image data saved to base64_images.txt');
            //     }
            // });
            //-----------------------------------------------------------------------------------------

            // const image1 = base64Images[0] || null;
            // const image2 = base64Images[1] || null;
            const insertImage = await cardmodel.insertcardbase65(base64Images, req.info);            
            if (insertImage.success != 1) throw errorUtils.createError(insertImage.msg, insertImage.success || 400);
            extractBusinessCardInfo.extractBusinessCardInfo(base64Images,insertImage.data['cardid'],req.info);
            res.status(200).json({ success: 1, msg: "Card Uploaded successfully" });

        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }

    },

    getcardlists: async (req, res) => {
        try {
            const getcardlist = await cardmodel.getcardlists();
            if (getcardlist.success != 1) throw errorUtils.createError(getcardlist.msg, getcardlist.success || 400);
            res.status(200).json({ success: 1, data: getcardlist.data });
        } catch (error) {
            winston.error(error);
            res.status(error.statusCode || 500).json({ success: 0, msg: error.message });
        }
    },
}


