const axios = require("axios");

const sendWhatsApp = async (no, text) => {
  try {
    const response = await axios.post(process.env.WA_API, {
      no,
      text,
      media: "",
      file: "",
    });

    return response.data;
  } catch (error) {
    console.log(error.message);
    throw error;
  }
};

module.exports = {
  sendWhatsApp,
};