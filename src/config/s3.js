const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Initialize S3 client
const s3Client = new S3Client({
  region:'ap-south-1',
  credentials: {
    accessKeyId:  process.env.S3_Access,
    secretAccessKey:  process.env.S3_SecretAccessKey,
  },
});

// Configuration
const BUCKET_NAME = 'vadilal-qa-format-soft-copy';
const CLOUDFRONT_BASE_URL = 'https://dvudc5qxjewcj.cloudfront.net/easycard-ib/';

/**
 * Generate current month folder path
 * @returns {string} Current month and year folder (e.g., "july25", "august25", "january26")
 */
function getCurrentMonthFolder() {
  const now = new Date();
  const monthNames = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const month = monthNames[now.getMonth()];
  const year = String(now.getFullYear());
  return `${month}${year}`;
}

/**
 * Generate timestamp in ddmmyyhhmmss format
 * @returns {string} Formatted timestamp
 */
function generateTimestamp() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = String(now.getFullYear()).slice(-2);
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${day}${month}${year}${hours}${minutes}${seconds}`;
}

/**
 * Upload single image to S3
 * @param {Buffer} buffer - Image buffer
 * @param {string} fileName - Name to use for S3 object
 * @returns {Promise<Object>} Upload result
 */
async function uploadToS3(buffer, fileName) {
  try {
    const monthFolder = getCurrentMonthFolder();
    const s3Key = `easycard-ib/${monthFolder}/${fileName}`;
    
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Body: buffer,
      ContentType: 'image/jpeg'
    });
    
    const result = await s3Client.send(command);
    
    // Return CloudFront URL
    const cloudFrontUrl = `${CLOUDFRONT_BASE_URL}${monthFolder}/${fileName}`;
    
    return {
      success: true,
      fileName: fileName,
      url: cloudFrontUrl,
      folder: monthFolder,
      etag: result.ETag,
    };
  } catch (error) {
    return {
      success: false,
      fileName: fileName,
      error: error.message,
    };
  }
}

/**
 * Main export function to upload images to S3
 * @param {Buffer|Array<Buffer>} imageBuffers - Single image buffer or array of image buffers
 * @param {string} name - Base name for the images (optional, defaults to empty string)
 * @returns {Promise<Object>} Upload results with front and back URLs
 */
async function exportToS3(imageBuffers, name = '') {
  try {
    const timestamp = generateTimestamp();
    const results = [];
    
    // Convert single buffer to array for consistent handling
    const buffers = Array.isArray(imageBuffers) ? imageBuffers : [imageBuffers];
    
    if (buffers.length === 0) {
      throw new Error('No image buffers provided');
    }
    
    if (buffers.length > 2) {
      throw new Error('Maximum 2 images supported');
    }
    
    // Initialize URLs
    let frontUrl = '';
    let backUrl = '';
    
    for (let i = 0; i < buffers.length; i++) {
      const buffer = buffers[i];
      
      if (!Buffer.isBuffer(buffer)) {
        results.push({
          success: false,
          fileName: null,
          error: `Invalid buffer provided at index ${i}`,
        });
        continue;
      }
      
      // Generate filename based on position
      const suffix = i === 0 ? 'front' : 'back';
      const fileName = `${name}${suffix}${timestamp}.jpg`;
      
      // Upload to S3
      const uploadResult = await uploadToS3(buffer, fileName);
      results.push(uploadResult);
      
      // Set URLs based on position
      if (i === 0 && uploadResult.success) {
        frontUrl = uploadResult.url;
      } else if (i === 1 && uploadResult.success) {
        backUrl = uploadResult.url;
      }
    }
    
    return {
      success: results.every(r => r.success),
      timestamp: timestamp,
      frontUrl: frontUrl,
      backUrl: backUrl,
      results: results,
      totalUploaded: results.filter(r => r.success).length,
    };
    
  } catch (error) {
    return {
      success: false,
      error: error.message,
      frontUrl: '',
      backUrl: '',
      results: [],
    };
  }
}

/**
 * Helper function to convert file paths to buffers
 * @param {string|Array<string>} filePaths - Single file path or array of file paths
 * @returns {Promise<Buffer|Array<Buffer>>} Buffer(s) for the file(s)
 */
function filePathsToBuffers(filePaths) {
  const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
  const buffers = paths.map(filePath => {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(filePath);
  });
  
  return Array.isArray(filePaths) ? buffers : buffers[0];
}

module.exports = {
  exportToS3,
  uploadToS3,
  generateTimestamp,
  getCurrentMonthFolder,
  filePathsToBuffers,
};

// Example usage:
/*
// Method 1: Upload single image buffer with name
const imageBuffer1 = fs.readFileSync('/path/to/image1.jpg');
const result1 = await exportToS3(imageBuffer1, 'product');

// Method 2: Upload two image buffers with name
const frontBuffer = fs.readFileSync('/path/to/front.jpg');
const backBuffer = fs.readFileSync('/path/to/back.jpg');
const result2 = await exportToS3([frontBuffer, backBuffer], 'product');

// Method 3: Upload without name (just timestamp and suffix)
const result3 = await exportToS3([frontBuffer, backBuffer]);

// Method 4: Upload single image without name
const result4 = await exportToS3(frontBuffer);

console.log(result1);
// Output example (single image with name):
// {
//   success: true,
//   timestamp: '290725143022',
//   frontUrl: 'https://dvudc5qxjewcj.cloudfront.net/easycard-ib/july25/productfront290725143022.jpg',
//   backUrl: '',
//   results: [...],
//   totalUploaded: 1
// }

console.log(result2);
// Output example (two images with name):
// {
//   success: true,
//   timestamp: '290725143022',
//   frontUrl: 'https://dvudc5qxjewcj.cloudfront.net/easycard-ib/july25/productfront290725143022.jpg',
//   backUrl: 'https://dvudc5qxjewcj.cloudfront.net/easycard-ib/july25/productback290725143022.jpg',
//   results: [...],
//   totalUploaded: 2
// }

console.log(result3);
// Output example (two images without name):
// {
//   success: true,
//   timestamp: '290725143022',
//   frontUrl: 'https://dvudc5qxjewcj.cloudfront.net/easycard-ib/july25/front290725143022.jpg',
//   backUrl: 'https://dvudc5qxjewcj.cloudfront.net/easycard-ib/july25/back290725143022.jpg',
//   results: [...],
//   totalUploaded: 2
// }

console.log(result4);
// Output example (single image without name):
// {
//   success: true,
//   timestamp: '290725143022',
//   frontUrl: 'https://dvudc5qxjewcj.cloudfront.net/easycard-ib/july25/front290725143022.jpg',
//   backUrl: '',
//   results: [...],
//   totalUploaded: 1
// }

// Easy access to URLs
const { frontUrl, backUrl } = await exportToS3([frontBuffer, backBuffer], 'product');
console.log('Front Image:', frontUrl);
console.log('Back Image:', backUrl || 'Not provided');
*/