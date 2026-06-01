const path = require("path");
const fs = require("fs");
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const multer = require("multer");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = process.env.SECRET_KEY;
const WAGW_SEND_API = process.env.WAGW_SEND_API || "http://localhost:3000/api/send";
const UPLOAD_DIR = process.env.UPLOAD_DIR || "C:\\wagw-uploads";
const PORT = process.env.PORT ? Number(process.env.PORT) : 5001;

if (!SECRET_KEY) {
    console.error("[vm-receiver] SECRET_KEY is not set");
    process.exit(1);
}

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        const ext = path.extname(file.originalname || "");
        const base = path.basename(file.originalname || "upload", ext).replace(/[^a-zA-Z0-9_-]/g, "");
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${base || "file"}-${unique}${ext || ""}`);
    },
});

const upload = multer({
    storage,
    limits: {
        fileSize: 16 * 1024 * 1024, // 16MB
    },
});

function getSecretFromHeader(req) {
    return req.headers["x-secret-key"] || req.headers["X-SECRET-KEY"] || "";
}

async function sendToWagw({ no, text, mimeType, caption, savedFilePath }) {
    // WAGW PRO payload:
    // - media untuk image/video/audio
    // - file untuk pdf/document
    const isDocument = mimeType === "application/pdf";

    const payload = {
        no,
        text: caption || text,
        media: isDocument ? "" : savedFilePath,
        file: isDocument ? savedFilePath : "",
    };

    const response = await axios.post(WAGW_SEND_API, payload, {
        timeout: 60000,
        headers: { "Content-Type": "application/json" },
    });

    return response.data;
}

app.post(
    "/receive",
    upload.single("file"),
    async (req, res) => {
        const secret = getSecretFromHeader(req);
        if (!secret || secret !== SECRET_KEY) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        try {
            const { no, text, mimeType, caption } = req.body || {};

            if (!no) {
                return res.status(400).json({ success: false, message: "Missing 'no'" });
            }
            if (typeof text !== "string") {
                return res.status(400).json({ success: false, message: "Missing/invalid 'text'" });
            }

            if (!req.file) {
                return res.status(400).json({ success: false, message: "Missing uploaded file" });
            }

            const savedFilePath = req.file.path;

            // Hapus setelah 60 detik (sesuai rule)
            setTimeout(() => {
                fs.unlink(savedFilePath, (err) => {
                    if (err) {
                        console.error("[vm-receiver] failed to delete file:", savedFilePath, err.message);
                    }
                });
            }, 60 * 1000);

            const data = await sendToWagw({
                no,
                text,
                mimeType: mimeType || req.file.mimetype,
                caption,
                savedFilePath,
            });

            return res.json({ success: true, data });
        } catch (err) {
            console.error("[vm-receiver] /receive error:", err?.message || err);
            return res.status(500).json({ success: false, message: err?.message || "VM receiver error" });
        }
    }
);

app.get("/health", (req, res) => {
    res.json({ ok: true });
});

app.listen(PORT, () => {
    console.log(`[vm-receiver] listening on port ${PORT}`);
});

