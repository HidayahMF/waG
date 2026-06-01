const fs = require("fs");

const { poolPromise } = require("../config/db");
const {
  sendWhatsApp,
  sendWhatsAppWithMedia,
} = require("../services/whatsappService");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatPhone = (phone) => {
  if (!phone) return "";

  let cleaned = String(phone).replace(/\D/g, "");

  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.slice(1);
  }

  if (cleaned.startsWith("8")) {
    cleaned = "62" + cleaned;
  }

  return cleaned;
};

const getEmployees = async (req, res) => {
  try {
    const db = await poolPromise;

    const result = await db.request().query(`
      SELECT
        Id_Employee AS id,        -- UNIQUE IDENTIFIER untuk selection & key React
        nip,                      -- hanya untuk display & search/filter
        Name AS nama,
        Phone AS no_hp
      FROM hris_Employee
      WHERE is_Active = 1
    `);

    res.json(result.recordset);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

function scheduleDeleteTempFile(tempFilePath) {
  if (!tempFilePath) return;

  // sesuai rule: delay 60 detik
  setTimeout(() => {
    fs.unlink(tempFilePath, (err) => {
      if (err) {
        console.error("[sendBroadcast] failed to delete temp file:", tempFilePath, err.message);
      }
    });
  }, 60 * 1000);
}

const sendBroadcast = async (req, res) => {
  try {
    // Multipart: req.body fields are strings
    // JSON: req.body.employees is already array
    const { message } = req.body;

    let employees = req.body.employees;
    if (typeof employees === "string") {
      try {
        employees = JSON.parse(employees);
      } catch {
        // keep as string (will fail validation below)
      }
    }

    const hasFile = Boolean(req.file);

    // Debug: pastikan request body sesuai contract
    console.log("[sendBroadcast] message type:", typeof message);
    console.log("[sendBroadcast] employees is array:", Array.isArray(employees));
    console.log("[sendBroadcast] employees length:", Array.isArray(employees) ? employees.length : null);
    console.log("[sendBroadcast] hasFile:", hasFile);

    if (!message || typeof message !== "string") {
      return res.status(400).json({ message: "message wajib berupa string" });
    }

    if (!Array.isArray(employees) || employees.length === 0) {
      return res.status(400).json({
        message: "employees wajib berupa array dan tidak boleh kosong",
      });
    }

    const intervalMs = 10 * 1000;
    const results = [];

    const tempFilePath = req.file?.path;
    const mimeType = req.file?.mimetype;
    const originalName = req.file?.originalname;

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];

      const itemBase = {
        id: emp.id,
        nama: emp.nama,
        no_hp: emp.no_hp,
      };

      const formattedPhone = formatPhone(emp?.no_hp);

      if (!formattedPhone) {
        results.push({
          ...itemBase,
          status: "failed",
          error: "no_hp kosong",
        });
        continue;
      }

      if (formattedPhone.length < 10) {
        results.push({
          ...itemBase,
          status: "failed",
          error: "no_hp terlalu pendek",
        });
        continue;
      }

      try {
        if (hasFile) {
          console.log("[sendBroadcast] File received at backend:", {
            tempFilePath,
            mimeType,
            originalName,
          });

          await sendWhatsAppWithMedia(
            formattedPhone,
            message,
            tempFilePath,
            mimeType
          );
        } else {

          await sendWhatsApp(formattedPhone, message);
        }



        results.push({
          ...itemBase,
          status: "success",
        });
      } catch (error) {
        console.error('[sendBroadcast] sendWhatsAppWithMedia ERROR:', error?.message || error);
        console.error('[sendBroadcast] error stack:', error?.stack);

        results.push({
          ...itemBase,
          status: "failed",
          error: error?.message || "Gagal mengirim",
        });
      }


      if (i < employees.length - 1) {
        await sleep(intervalMs);
      }
    }

    // hapus file setelah semua penerima diproses
    if (hasFile) {
      console.log("[sendBroadcast] deleting temp file after 60s:", tempFilePath);
      scheduleDeleteTempFile(tempFilePath);
    }


    const success = results.filter((r) => r.status === "success").length;
    const failed = results.length - success;

    return res.json({
      success: failed === 0,
      summary: {
        total: results.length,
        success,
        failed,
      },
      results,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getEmployees,
  sendBroadcast,
};

