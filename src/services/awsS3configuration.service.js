const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

module.exports = {
    awsS3() {
        return new S3Client({
            credentials: {
                accessKeyId: process.env.ACCESS_KEYID,
                secretAccessKey: process.env.SECRET_ACCESS_KEY,
            },
            region: process.env.REGION
        })
    },

    async awsPutObject(imagename, buffer, mimetype) {
        const params = {
            Bucket: process.env.BUCKET,
            Key: imagename,
            Body: buffer,
            ContentType: mimetype,
        };

        const command = new PutObjectCommand(params);
        const s3Client = await this.awsS3();
        return await s3Client.send(command);
    },

    async awsGetObject(imagename) {
        const getObjParams = {
            Bucket: process.env.BUCKET,
            Key: imagename,
        };

        const getcommand = new GetObjectCommand(getObjParams);
        const s3Client = await this.awsS3();
        const data = await getSignedUrl(s3Client, getcommand);
        return data;
    },

    async awsDeleteObject(imageUrl) {
        const imageKey = this.extractS3Key(imageUrl);
        if (!imageKey) {
            console.error("Invalid S3 image URL:", imageUrl);
            return;
        }

        const deleteParams = {
            Bucket: process.env.BUCKET,
            Key: imageKey,
        };

        try {
            const s3Client = await this.awsS3();
            const deleteCommand = new DeleteObjectCommand(deleteParams);
            return await s3Client.send(deleteCommand);
        } catch (error) {
            throw new Error("Failed to delete old image");
        }
    },

    extractS3Key(imageUrl) {
        if (!imageUrl) return null;
        try {
            const urlParts = new URL(imageUrl);
            return urlParts.pathname.substring(1);
        } catch (error) {
            console.error("Error extracting S3 key from URL:", imageUrl, error);
            return null;
        }
    }
};
