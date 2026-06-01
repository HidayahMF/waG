const express = require("express");
const {
  getEmployees,
  sendBroadcast,
} = require("../controllers/broadcastController");

const { upload } = require("../config/upload");

const router = express.Router();

router.get("/employees", getEmployees);
router.post("/send", upload.single("file"), sendBroadcast);

module.exports = router;

