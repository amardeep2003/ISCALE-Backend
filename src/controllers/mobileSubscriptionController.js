// Tracks the iScale mobile app's one-time "lifetime access" purchase per
// candidate account. There's no payment gateway wired in yet, so `activate`
// is a placeholder that just flips the flag - swap it for a real payment
// verification step once a provider is chosen.
const Candidate = require("../models/candidates");

exports.getStatus = async (req, res) => {
  try {
    const user = await Candidate.findById(req.user.id).select(
      "mobile_app_lifetime_access",
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
        hasLifetimeAccess: !!user.mobile_app_lifetime_access,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.activate = async (req, res) => {
  try {
    const user = await Candidate.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    user.mobile_app_lifetime_access = true;
    await user.save();

    return res.status(200).json({
      status: true,
      message: "Lifetime access activated",
      data: {
        hasLifetimeAccess: true,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
