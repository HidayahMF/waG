const multer = require("multer");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "video/mp4",
    "audio/mpeg",
    "application/pdf",
]);

const upload = multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, UPLOAD_DIR);
        },
        filename: function (req, file, cb) {
            const ext = path.extname(file.originalname || "");
            const base = path
                .basename(file.originalname || "upload", ext)
                .replace(/[^a-zA-Z0-9_-]/g, "");
            const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
            cb(null, `${base || "upload"}-${unique}${ext || ""}`);
        },
    }),
    limits: {
        fileSize: 16 * 1024 * 1024, // 16MB
    },
    fileFilter: function (req, file, cb) {
        if (!file?.mimetype) return cb(null, false);
        if (ALLOWED_MIME_TYPES.has(file.mimetype)) return cb(null, true);
        return cb(
            new Error(
                `Invalid file type. Allowed: ${Array.from(ALLOWED_MIME_TYPES).join(", ")}`
            )
        );
    },
});

module.exports = {
    upload,
    ALLOWED_MIME_TYPES,
    UPLOAD_DIR,
};

