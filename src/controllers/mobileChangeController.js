const jwt = require("jsonwebtoken");
const Candidate = require("../models/candidates");
const sendSms = require("../utils/sendSms");
const { generateMobileChangeToken } = require("../utils/token");

const OTP_TTL_MS = 5 * 60 * 1000;
const MOBILE_DLT_ID = "1307173398514201568";

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

// A mobileChangeToken is only required when the account already has a
// verified c_contact (proving ownership of the number being replaced).
// First-time additions (e.g. Google accounts with no number yet) skip
// straight to send-new-otp/verify-new-otp with no token needed.
const readMobileChangeToken = (req) => {
  const token = req.headers["x-mobile-change-token"];

  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "mobile_change" || decoded.id !== req.user.id) {
      return null;
    }

    return decoded;
  } catch {
    return null;
  }
};

// POST /mobile/send-current-otp
exports.sendCurrentMobileOtp = async (req, res) => {
  try {
    const user = await Candidate.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (!user.c_contact) {
      return res.status(400).json({
        status: false,
        message: "No mobile number on file, use send-new-otp to add one",
      });
    }

    const otp = generateOtp();

    await Candidate.updateOne(
      { _id: user._id },
      {
        $set: {
          c_new_contact_otp: otp,
          c_new_contact_otp_expiry: new Date(Date.now() + OTP_TTL_MS),
        },
      },
    );

    const message = `${otp} is the OTP to verify your current mobile number. Do not share it with anyone. - The iScale`;

    await sendSms(message, user.c_contact, MOBILE_DLT_ID);

    return res.status(200).json({
      status: true,
      message: "OTP sent to your current mobile number",
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// POST /mobile/verify-current-otp  { otp }
exports.verifyCurrentMobileOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ status: false, message: "OTP is required" });
    }

    const user = await Candidate.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (!user.c_new_contact_otp || user.c_new_contact_otp !== otp) {
      return res.status(400).json({ status: false, message: "Invalid OTP" });
    }

    if (!user.c_new_contact_otp_expiry || user.c_new_contact_otp_expiry < new Date()) {
      return res.status(400).json({ status: false, message: "OTP expired" });
    }

    await Candidate.updateOne(
      { _id: user._id },
      { $set: { c_new_contact_otp: null, c_new_contact_otp_expiry: null } },
    );

    const mobileChangeToken = generateMobileChangeToken(user);

    return res.status(200).json({
      status: true,
      message: "Current mobile number verified",
      mobileChangeToken,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// POST /mobile/send-new-otp  { newMobile }
// Requires x-mobile-change-token only if the account already has a c_contact.
exports.sendNewMobileOtp = async (req, res) => {
  try {
    const { newMobile } = req.body;

    if (!newMobile || String(newMobile).length !== 10) {
      return res.status(400).json({
        status: false,
        message: "A valid 10-digit mobile number is required",
      });
    }

    const user = await Candidate.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (user.c_contact) {
      const token = readMobileChangeToken(req);

      if (!token) {
        return res.status(401).json({
          status: false,
          message: "Mobile change token required",
        });
      }
    }

    const normalizedMobile = Number(newMobile);

    const existing = await Candidate.findOne({
      c_contact: normalizedMobile,
      _id: { $ne: user._id },
    });

    if (existing) {
      return res.status(400).json({
        status: false,
        message: "This mobile number is already linked to another account",
      });
    }

    const otp = generateOtp();

    await Candidate.updateOne(
      { _id: user._id },
      {
        $set: {
          c_new_contact: normalizedMobile,
          c_new_contact_otp: otp,
          c_new_contact_otp_expiry: new Date(Date.now() + OTP_TTL_MS),
        },
      },
    );

    const message = `${otp} is the OTP to verify your new mobile number. Do not share it with anyone. - The iScale`;

    await sendSms(message, normalizedMobile, MOBILE_DLT_ID);

    return res.status(200).json({
      status: true,
      message: "OTP sent to your new mobile number",
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// POST /mobile/verify-new-otp  { otp }
// Requires x-mobile-change-token only if the account already has a c_contact.
exports.verifyNewMobileOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ status: false, message: "OTP is required" });
    }

    const user = await Candidate.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (user.c_contact) {
      const token = readMobileChangeToken(req);

      if (!token) {
        return res.status(401).json({
          status: false,
          message: "Mobile change token required",
        });
      }
    }

    if (!user.c_new_contact || !user.c_new_contact_otp) {
      return res.status(400).json({
        status: false,
        message: "No pending mobile number change found, please start over",
      });
    }

    if (user.c_new_contact_otp !== otp) {
      return res.status(400).json({ status: false, message: "Invalid OTP" });
    }

    if (!user.c_new_contact_otp_expiry || user.c_new_contact_otp_expiry < new Date()) {
      return res.status(400).json({ status: false, message: "OTP expired" });
    }

    const existing = await Candidate.findOne({
      c_contact: user.c_new_contact,
      _id: { $ne: user._id },
    });

    if (existing) {
      return res.status(400).json({
        status: false,
        message: "This mobile number is already linked to another account",
      });
    }

    const newMobile = user.c_new_contact;

    await Candidate.updateOne(
      { _id: user._id },
      {
        $set: { c_contact: newMobile, c_mobile_verified: 1 },
        $unset: {
          c_new_contact: "",
          c_new_contact_otp: "",
          c_new_contact_otp_expiry: "",
        },
      },
    );

    return res.status(200).json({
      status: true,
      message: "Mobile number updated successfully",
      mobile: newMobile,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
