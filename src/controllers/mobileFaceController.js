// Proxies the iScale mobile app's face-biometric calls to MXFace.ai, so the
// MXFace subscription key lives only on this server and never ships inside
// the Flutter app.
const axios = require("axios");
const Candidate = require("../models/candidates");
const { uploadBufferWithMeta } = require("../services/storageService");

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
// ENROLL FACE (server-side persistence)
// ======================================
// One-time write: this account's face gets locked in here so a reinstall or
// a new device can't be used to enroll a *different* face under the same
// account. The app should only call this once, right after the local
// liveness/detect checks pass on FaceRegistrationScreen.
exports.enrollFace = async (req, res) => {
  try {
    const { encoded_image } = req.body;

    if (!encoded_image) {
      return res.status(400).json({
        status: false,
        message: "encoded_image is required",
      });
    }

    const user = await Candidate.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (user.mobile_app_face_registered) {
      return res.status(400).json({
        status: false,
        message: "A face is already enrolled for this account",
      });
    }

    const buffer = Buffer.from(encoded_image, "base64");
    const uploaded = await uploadBufferWithMeta(
      buffer,
      `${user._id}-face.jpg`,
      "image/jpeg",
      "mobile-app/faces",
    );

    user.mobile_app_face_registered = true;
    user.mobile_app_face_image = uploaded.url;
    user.mobile_app_face_image_public_id = uploaded.public_id;
    await user.save();

    return res.status(200).json({
      status: true,
      message: "Face enrolled successfully",
      data: {
        hasFaceRegistered: true,
        faceImageUrl: uploaded.url,
      },
    });
  } catch (error) {
    console.error("Face enroll error:", error.message);
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// ======================================
// FACE STATUS
// ======================================
exports.getFaceStatus = async (req, res) => {
  try {
    const user = await Candidate.findById(req.user.id).select(
      "mobile_app_face_registered mobile_app_face_image",
    );

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: true,
      data: {
        hasFaceRegistered: !!user.mobile_app_face_registered,
        faceImageUrl: user.mobile_app_face_image || null,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
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
