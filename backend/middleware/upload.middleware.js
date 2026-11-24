const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const multer = require('multer');

// Ensure uploads directory exists
const uploadDir = path.resolve(__dirname, '../../data/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer Disk Storage with Secure Random File Naming
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate cryptographically secure UUID and enforce .pdf extension
    const uniqueId = crypto.randomUUID();
    const cleanExt = '.pdf';
    cb(null, `${uniqueId}${cleanExt}`);
  }
});

// File Filter: strictly accept PDFs
const fileFilter = (req, file, cb) => {
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = path.extname(file.originalname).toLowerCase() === '.pdf';

  if (isPdfMime && isPdfExt) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only PDF research papers (.pdf) are supported.');
    error.status = 400;
    cb(error, false);
  }
};

// Max File Size Limit (default 20MB)
const maxFileSizeMB = parseInt(process.env.MAX_PDF_SIZE_MB || '20', 10);

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSizeMB * 1024 * 1024 // 20 MB
  }
});

module.exports = upload;
