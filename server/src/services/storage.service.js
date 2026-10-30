import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localUploadsDir = path.resolve(__dirname, '../../../storage/uploads');

// Ensure local uploads directory exists
if (!fs.existsSync(localUploadsDir)) {
  fs.mkdirSync(localUploadsDir, { recursive: true });
}

export function computeSha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export async function uploadFile(buffer, originalFilename = 'photo.jpg', folder = 'inspections') {
  const sha256 = computeSha256(buffer);

  if (env.STORAGE_DRIVER === 'cloudinary' && env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY) {
    try {
      const { v2: cloudinary } = await import('cloudinary');
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
      });

      return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `leaseledger/${folder}`,
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) return reject(error);
            resolve({
              fileUrl: result.secure_url,
              publicId: result.public_id,
              sha256,
            });
          }
        );
        uploadStream.end(buffer);
      });
    } catch (err) {
      console.warn('[StorageService] Cloudinary upload failed, falling back to local storage:', err.message);
    }
  }

  // Local storage fallback
  const ext = path.extname(originalFilename) || '.jpg';
  const filename = `${uuidv4()}${ext}`;
  const targetPath = path.join(localUploadsDir, filename);

  fs.writeFileSync(targetPath, buffer);

  const fileUrl = `/uploads/${filename}`;
  return {
    fileUrl,
    publicId: filename,
    sha256,
  };
}

export async function deleteFile(publicId) {
  if (env.STORAGE_DRIVER === 'cloudinary' && env.CLOUDINARY_CLOUD_NAME) {
    try {
      const { v2: cloudinary } = await import('cloudinary');
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (err) {
      console.error('[StorageService] Cloudinary delete failed:', err.message);
    }
  }

  // Local disk delete
  try {
    const targetPath = path.join(localUploadsDir, publicId);
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }
    return true;
  } catch (err) {
    console.error('[StorageService] Local delete failed:', err.message);
    return false;
  }
}
