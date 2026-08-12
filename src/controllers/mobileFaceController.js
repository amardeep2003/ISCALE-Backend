// Proxies the iScale mobile app's face-biometric calls to MXFace.ai, so the
// MXFace subscription key lives only on this server and never ships inside
// the Flutter app.
const axios = require("axios");

const MXFACE_BASE_URL =
  process.env.MXFACE_BASE_URL || "https://faceapi.mxface.ai/api/v3";

const mxfaceHeaders = () => ({
  "Content-Type": "application/json",
  Subscriptionkey: process.env.MXFACE_SUBSCRIPTION_KEY,
});

// ======================================
// HEALTH CHECK
// ======================================
exports.health = (req, res) => {
  return res.status(200).json({
    status: true,
    message: "the iScale mobile API is up",
    timestamp: new Date().toISOString(),
  });
};

// ======================================
// LIVENESS CHECK
// ======================================
exports.checkLiveness = async (req, res) => {
  try {
    const { encoded_image } = req.body;

    if (!encoded_image) {
      return res.status(400).json({
        status: false,
        message: "encoded_image is required",
      });
    }

    const response = await axios.post(
      `${MXFACE_BASE_URL}/face/Liveness`,
      { encoded_image },
      { headers: mxfaceHeaders() },
    );

    return res.status(200).json({
      status: true,
      data: response.data,
    });
  } catch (error) {
    console.error("MXFace Liveness Error:", error.response?.data || error.message);

    return res.status(502).json({
      status: false,
      message: "Liveness check failed",
      error: error.response?.data || error.message,
    });
  }
};

// ======================================
// FACE DETECT
// ======================================
exports.detectFace = async (req, res) => {
  try {
    const { encoded_image } = req.body;

    if (!encoded_image) {
      return res.status(400).json({
        status: false,
        message: "encoded_image is required",
      });
    }

    const response = await axios.post(
      `${MXFACE_BASE_URL}/face/detect`,
      { encoded_image },
      { headers: mxfaceHeaders() },
    );

    return res.status(200).json({
      status: true,
      data: response.data,
    });
  } catch (error) {
    console.error("MXFace Detect Error:", error.response?.data || error.message);

    return res.status(502).json({
      status: false,
      message: "Face detection failed",
      error: error.response?.data || error.message,
    });
  }
};

// ======================================
// FACE VERIFY (COMPARE)
// ======================================
exports.verifyFaces = async (req, res) => {
  try {
    const { encoded_image1, encoded_image2 } = req.body;

    if (!encoded_image1 || !encoded_image2) {
      return res.status(400).json({
        status: false,
        message: "encoded_image1 and encoded_image2 are required",
      });
    }

    const response = await axios.post(
      `${MXFACE_BASE_URL}/face/verify`,
      { encoded_image1, encoded_image2 },
      { headers: mxfaceHeaders() },
    );

    return res.status(200).json({
      status: true,
      data: response.data,
    });
  } catch (error) {
    console.error("MXFace Verify Error:", error.response?.data || error.message);

    return res.status(502).json({
      status: false,
      message: "Face verification failed",
      error: error.response?.data || error.message,
    });
  }
};
