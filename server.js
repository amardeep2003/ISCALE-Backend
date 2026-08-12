require("dotenv").config(); // env variables
const path = require("path");


const express = require("express");
const cors = require("cors");

const app = express();

const connectDB = require("./src/config/db");
connectDB();

//  middlewares
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb",extended: true }));
app.use(cors());



app.use(
  "/uploads",
  express.static(path.join(__dirname, "src/uploads"))
);

app.use(
  "/assets",
  express.static(path.join(__dirname, "/assets"))
);


// Admin routes
const adminRoutes = require("./src/routes/adminRoutes");
app.use("/myadmin", adminRoutes);


// Google OAuth routes (callback: /auth/google/callback)
const googleAuthRoutes = require("./src/routes/googleAuthRoutes");
app.use("/auth", googleAuthRoutes);


// User main Routes 
const userAllRoutes = require("./src/routes/userAllRoutes");
app.use("/api", userAllRoutes);



const appAllRoutes = require("./src/routes/appAllRoutes");
app.use("/app", appAllRoutes);



const dataAnalyticsRoutes = require("./src/routes/dataAnalyticsRoutes");
app.use("/DataAnalytics", dataAnalyticsRoutes);


// the iScale mobile app (face-lock) routes
const mobileAppRoutes = require("./src/routes/mobileAppRoutes");
app.use("/app2", mobileAppRoutes);



//  default route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// cloudinary.api.ping()
// .then(console.log)
// .catch(console.error);

app.use((err, req, res, next) => {
  console.error(" ERROR START ");
  console.error(err);
  console.error(" ERROR END ");

  res.status(500).json({
    status: false,
    message: err.message,
  });
});

//  404 handler
app.use((req, res) => {
  res.status(404).send({ message: "Route not found" });
});

//  PORT from env
const PORT = process.env.PORT || 5000;

//  start server
app.listen(PORT, () => {
  console.log(`server is running on port ${PORT}`);
});