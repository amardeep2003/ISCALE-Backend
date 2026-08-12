// Shared-secret gate for the iScale mobile app's endpoints. This app has no
// user login (single lifetime-license device), so instead of JWT auth we
// just check a static app key sent by the Flutter client. This keeps the
// proxied MXFace calls from being hit by randoms and burning the MXFace
// quota, without needing a real auth system for a single-user app.
exports.mobileAppMiddleware = (req, res, next) => {
  const appKey = req.headers["x-app-key"];

  if (!appKey || appKey !== process.env.MOBILE_APP_API_KEY) {
    return res.status(401).send({
      status: false,
      message: "Invalid or missing app key",
    });
  }

  next();
};
