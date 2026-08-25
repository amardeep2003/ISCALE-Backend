const Candidate = require("../models/candidates");

// E.164-ish: optional leading "+", 7-15 digits total (covers Indian
// 10-digit numbers and international formats alike). Not full E.164
// validation (that needs a per-country library) - just loose enough to
// not reject legitimate international numbers while catching junk input.
const MOBILE_REGEX = /^\+?[0-9]{7,15}$/;

// Google sign-in serves international students whose numbers our SMS
// vendor can't reach, so there's no OTP step here. A phone number can be
// added once from the profile and is then permanent — no OTP-verified
// "change" flow, by design.
exports.addMobileNumber = async (req, res) => {
  try {
    const { mobile } = req.body;

    const trimmedMobile = typeof mobile === "string" ? mobile.trim() : "";

    if (!MOBILE_REGEX.test(trimmedMobile)) {
      return res.status(400).json({
        status: false,
        message: "A valid mobile number is required",
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

    // c_contact is schema'd as String, but some legacy candidates may have
    // it stored as a raw Number (a write path that bypassed Mongoose's
    // cast-on-save) - match both so this duplicate check can't miss them.
    const existing = await Candidate.findOne({
      $or: [
        { c_contact: trimmedMobile },
        { c_contact: Number(trimmedMobile) },
      ],
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
      { $set: { c_contact: trimmedMobile } },
    );

    return res.status(200).json({
      status: true,
      message: "Mobile number added successfully",
      mobile: trimmedMobile,
    });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
