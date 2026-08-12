// Tracks the iScale mobile app's one-time "lifetime access" purchase per
// candidate account, paid for via Razorpay. Order creation + payment
// verification live here; the admin's manual grant/revoke toggle lives in
// appUserController.toggleLifetimeAccess instead (support/comps/refunds).
const crypto = require("crypto");
const Razorpay = require("razorpay");
const Candidate = require("../models/candidates");

// ₹999 - keep in sync with what the app displays on the paywall.
const LIFETIME_ACCESS_AMOUNT_PAISE = 99900;
const CURRENCY = "INR";

// Lazily constructed so a missing RAZORPAY_KEY_ID/SECRET only breaks the
// payment endpoints when they're actually called, not the whole server at
// startup (this module gets require()'d as part of the route tree).
let razorpayClient = null;
const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error(
      "Razorpay is not configured - set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET",
    );
  }
  if (!razorpayClient) {
    razorpayClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return razorpayClient;
};

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

// ======================================
// CREATE RAZORPAY ORDER
// ======================================
exports.createOrder = async (req, res) => {
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

    if (user.mobile_app_lifetime_access) {
      return res.status(400).json({
        status: false,
        message: "You already have lifetime access",
      });
    }

    const order = await getRazorpay().orders.create({
      amount: LIFETIME_ACCESS_AMOUNT_PAISE,
      currency: CURRENCY,
      // Razorpay caps receipt at 40 chars.
      receipt: `iscale_app_${req.user.id}`.slice(0, 40),
      notes: {
        candidate_id: req.user.id,
        purpose: "iscale_mobile_app_lifetime_access",
      },
    });

    return res.status(200).json({
      status: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      },
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    return res.status(500).json({
      status: false,
      message: error.message || "Failed to create payment order",
    });
  }
};

// ======================================
// VERIFY PAYMENT & GRANT ACCESS
// ======================================
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        status: false,
        message:
          "razorpay_order_id, razorpay_payment_id and razorpay_signature are required",
      });
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return res.status(500).json({
        status: false,
        message: "Razorpay is not configured on the server",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        status: false,
        message: "Payment verification failed",
      });
    }

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
      message: "Payment verified - lifetime access activated",
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
