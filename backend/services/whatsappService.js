const axios = require("axios");
const fs = require("fs");
const path = require("path");

const { copyToNetworkPath } = require("../config/networkCopy");

const sendWhatsApp = async (no, text) => {
  const waApi = process.env.WA_API;
  if (!waApi) {
    throw new Error("WA_API environment variable is not set (set WA_API di backend/.env)");
  }

  try {
    const response = await axios.post(
      waApi,
      { no, text, media: "", file: "" },
      { timeout: 15000, headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (err) {
    const status = err?.response?.status;
    const data = err?.response?.data;
    throw new Error(
      `WA gateway error${status ? ` (status ${status})` : ""}: ${typeof data === "object" ? JSON.stringify(data) : data || err.message
      }`
    );
  }
};

function getMimeMode(mimeType) {
  return mimeType === "application/pdf" ? "document" : "media";
}

const sendWhatsAppWithMedia = async (no, text, localFilePath, mimeType) => {
  console.log('[DEBUG] sendWhatsAppWithMedia called with:', {
    no,
    text,
    localFilePath,
    mimeType,
  });
  console.log('[DEBUG] WAGW_API:', process.env.WAGW_API);
  console.log('[DEBUG] WAGW_FILE_DIR:', process.env.WAGW_FILE_DIR);
  console.log('[DEBUG] file exists:', !!(localFilePath && fs.existsSync(localFilePath)));

  const wagwApi = process.env.WAGW_API;
  const wagwFileDir = process.env.WAGW_FILE_DIR;

  // Jangan throw sebelum ada petunjuk jelas; log dulu biar bisa debug env loading.
  if (!wagwApi) {
    throw new Error(
      'WAGW_API tidak di-set (process.env.WAGW_API undefined). Pastikan backend memakai .env yang benar dan server.js/load dotenv aktif.'
    );
  }
  if (!wagwFileDir) {
    throw new Error(
      'WAGW_FILE_DIR tidak di-set (process.env.WAGW_FILE_DIR undefined). Pastikan backend memakai .env yang benar dan server.js/load dotenv aktif.'
    );
  }
  if (!localFilePath || !fs.existsSync(localFilePath)) {
    throw new Error(`File tidak ditemukan: ${localFilePath}`);
  }


  const filename = path.basename(localFilePath);


  // UNC path untuk copy via SMB dari PC ke VM
  const smbDir = "\\\\10.19.25.70\\WGPRO\\public\\wagwfile\\file";
  const remoteDestPathOnSmb = smbDir + "\\" + filename;

  // Path lokal VM untuk dikirim ke WAGW API
  // Normalisasi: ganti forward slash ke backslash untuk Windows path
  const normalizedDir = wagwFileDir.replace(/\//g, "\\");
  const remoteDestPathOnVm = normalizedDir + "\\" + filename;

  console.log("[sendWhatsAppWithMedia] file local:", localFilePath);
  console.log("[sendWhatsAppWithMedia] SMB destination:", remoteDestPathOnSmb);
  console.log("[sendWhatsAppWithMedia] VM local path:", remoteDestPathOnVm);

  await copyToNetworkPath({
    srcPath: localFilePath,
    destPath: remoteDestPathOnSmb,
  });

  await new Promise((r) => setTimeout(r, 1000));

  const mode = getMimeMode(mimeType);
  const payload = {
    no,
    text,
    media: mode === "media" ? remoteDestPathOnVm : "",
    file: mode === "document" ? remoteDestPathOnVm : "",
  };

  console.log("[sendWhatsAppWithMedia] WAGW API payload:", payload);

  const response = await axios.post(wagwApi, payload, {
    timeout: 60000,
    headers: { "Content-Type": "application/json" },
  });

  console.log("[sendWhatsAppWithMedia] WAGW response:", response.data);

  return response.data;
};

module.exports = { sendWhatsApp, sendWhatsAppWithMedia };