const jwt = require("jsonwebtoken");

exports.emailChangeMiddleware = (req, res, next) => {
  try {
    const token = req.headers["x-email-change-token"];

    if (!token) {
      return res.status(401).json({
        status: false,
        message: "Email change token required",
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (decoded.type !== "email_change" || decoded.id !== req.user.id) {
      return res.status(401).json({
        status: false,
        message: "Invalid email change token",
      });
    }

    req.emailChangeUser = decoded;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        status: false,
        message: "Email change token expired, please verify your current email again",
      });
    }

    return res.status(401).json({
      status: false,
      message: "Invalid email change token",
    });
  }
};
