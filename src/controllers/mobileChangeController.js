const Candidate = require("../models/candidates");

// Google sign-in serves international students whose numbers our SMS
// vendor can't reach, so there's no OTP step here. A phone number can be
// added once from the profile and is then permanent — no OTP-verified
// "change" flow, by design.
exports.addMobileNumber = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile || String(mobile).length !== 10) {
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
      return res.status(400).json({
        status: false,
        message: "A mobile number is already set on this account and cannot be changed",
      });
    }

    const normalizedMobile = Number(mobile);

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

    await Candidate.updateOne(
      { _id: user._id },
      { $set: { c_contact: normalizedMobile } },
    );

    return res.status(200).json({
      status: true,
      message: "Mobile number added successfully",
      mobile: normalizedMobile,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
