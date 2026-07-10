const Candidate = require("../models/candidates");
const sendEmail = require("../utils/sendEmail");
const { generateEmailChangeToken } = require("../utils/token");

const OTP_TTL_MS = 5 * 60 * 1000;

const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const isGoogleAccount = (user) => Boolean(user.c_google_id);

// POST /email/send-current-otp
exports.sendCurrentEmailOtp = async (req, res) => {
  try {
    const user = await Candidate.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (isGoogleAccount(user)) {
      return res.status(403).json({
        status: false,
        message: "Email change is not available for Google-authenticated accounts",
      });
    }

    if (!user.c_email) {
      return res.status(400).json({
        status: false,
        message: "No email on file for this account",
      });
    }

    const otp = generateOtp();

    await Candidate.updateOne(
      { _id: user._id },
      {
        $set: {
          c_email_otp: otp,
          c_email_otp_expiry: new Date(Date.now() + OTP_TTL_MS),
        },
      },
    );

    await sendEmail({
      to: user.c_email,
      subject: "Verify your email - The iScale",
      text: `${otp} is the OTP to verify your current email. It expires in 5 minutes. Do not share it with anyone.`,
    });

    return res.status(200).json({
      status: true,
      message: "OTP sent to your current email",
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// POST /email/verify-current-otp  { otp }
exports.verifyCurrentEmailOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ status: false, message: "OTP is required" });
    }

    const user = await Candidate.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (isGoogleAccount(user)) {
      return res.status(403).json({
        status: false,
        message: "Email change is not available for Google-authenticated accounts",
      });
    }

    if (!user.c_email_otp || user.c_email_otp !== otp) {
      return res.status(400).json({ status: false, message: "Invalid OTP" });
    }

    if (!user.c_email_otp_expiry || user.c_email_otp_expiry < new Date()) {
      return res.status(400).json({ status: false, message: "OTP expired" });
    }

    await Candidate.updateOne(
      { _id: user._id },
      { $set: { c_email_otp: null, c_email_otp_expiry: null } },
    );

    const emailChangeToken = generateEmailChangeToken(user);

    return res.status(200).json({
      status: true,
      message: "Current email verified",
      emailChangeToken,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// POST /email/send-new-otp  { newEmail }  (requires x-email-change-token)
exports.sendNewEmailOtp = async (req, res) => {
  try {
    const { newEmail } = req.body;

    if (!newEmail) {
      return res.status(400).json({ status: false, message: "New email is required" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({
        status: false,
        message: "Please enter a valid email address",
      });
    }

    const user = await Candidate.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (isGoogleAccount(user)) {
      return res.status(403).json({
        status: false,
        message: "Email change is not available for Google-authenticated accounts",
      });
    }

    const normalizedEmail = newEmail.toLowerCase();

    const existing = await Candidate.findOne({
      c_email: normalizedEmail,
      _id: { $ne: user._id },
    });

    if (existing) {
      return res.status(400).json({
        status: false,
        message: "This email is already linked to another account",
      });
    }

    const otp = generateOtp();

    await Candidate.updateOne(
      { _id: user._id },
      {
        $set: {
          c_new_email: normalizedEmail,
          c_new_email_otp: otp,
          c_new_email_otp_expiry: new Date(Date.now() + OTP_TTL_MS),
        },
      },
    );

    await sendEmail({
      to: normalizedEmail,
      subject: "Verify your new email - The iScale",
      text: `${otp} is the OTP to verify your new email. It expires in 5 minutes. Do not share it with anyone.`,
    });

    return res.status(200).json({
      status: true,
      message: "OTP sent to your new email",
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// POST /email/verify-new-otp  { otp }  (requires x-email-change-token)
exports.verifyNewEmailOtp = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return res.status(400).json({ status: false, message: "OTP is required" });
    }

    const user = await Candidate.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ status: false, message: "User not found" });
    }

    if (isGoogleAccount(user)) {
      return res.status(403).json({
        status: false,
        message: "Email change is not available for Google-authenticated accounts",
      });
    }

    if (!user.c_new_email || !user.c_new_email_otp) {
      return res.status(400).json({
        status: false,
        message: "No pending email change found, please start over",
      });
    }

    if (user.c_new_email_otp !== otp) {
      return res.status(400).json({ status: false, message: "Invalid OTP" });
    }

    if (!user.c_new_email_otp_expiry || user.c_new_email_otp_expiry < new Date()) {
      return res.status(400).json({ status: false, message: "OTP expired" });
    }

    // Re-check uniqueness right before committing, in case it was taken
    // in the window between send-new-otp and verify-new-otp.
    const existing = await Candidate.findOne({
      c_email: user.c_new_email,
      _id: { $ne: user._id },
    });

    if (existing) {
      return res.status(400).json({
        status: false,
        message: "This email is already linked to another account",
      });
    }

    const newEmail = user.c_new_email;

    await Candidate.updateOne(
      { _id: user._id },
      {
        $set: { c_email: newEmail, c_email_verified: 1 },
        $unset: { c_new_email: "", c_new_email_otp: "", c_new_email_otp_expiry: "" },
      },
    );

    return res.status(200).json({
      status: true,
      message: "Email updated successfully",
      email: newEmail,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
