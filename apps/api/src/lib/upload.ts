import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

export function ensureUploadDirs(): void {
  fs.mkdirSync(path.join(UPLOADS_DIR, 'avatars'), { recursive: true });
  fs.mkdirSync(path.join(UPLOADS_DIR, 'logos'), { recursive: true });
  fs.mkdirSync(path.join(UPLOADS_DIR, 'attachments'), { recursive: true });
}

function createStorage(subdir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(UPLOADS_DIR, subdir);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

const imageFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, WebP, and GIF images are allowed'));
  }
};

export const avatarUpload = multer({
  storage: createStorage('avatars'),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFilter,
});

export const logoUpload = multer({
  storage: createStorage('logos'),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: imageFilter,
});

const attachmentFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const blocked = ['application/x-msdownload', 'application/x-executable'];
  if (blocked.includes(file.mimetype)) {
    cb(new Error('File type not allowed'));
  } else {
    cb(null, true);
  }
};

export const attachmentUpload = multer({
  storage: createStorage('attachments'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: attachmentFilter,
});

export function buildUploadUrl(subdir: string, filename: string): string {
  return `${env.API_URL}/uploads/${subdir}/${filename}`;
}

export const uploadsPath = UPLOADS_DIR;
