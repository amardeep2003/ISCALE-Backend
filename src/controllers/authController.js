const Candidate = require("../models/candidates");
// const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { generateTokenUser } = require("../utils/token");
// const Candidate = require("../models/candidate");
const sendSms = require("../utils/sendSms");
const sendEmail = require("../utils/sendEmail");
const generateCandidateIdno = require("../utils/generateCandidateIdno");
const { generateResetToken, generateRegisterToken } = require("../utils/token");
const validator = require("validator");
// const bcrypt = require("bcrypt");

// Best-effort: registration should not fail just because the welcome
// email couldn't be sent. Never log the plaintext password.
const sendPasswordEmail = async (email, password) => {
  if (!email) return;

  try {
    await sendEmail({
      to: email,
      subject: "Your account password - The iScale",
      text: `Welcome to The iScale! Your account password is: ${password}\n\nPlease keep it safe and change it after logging in if you'd like.`,
    });
  } catch (error) {
    console.log("Failed to send password email:", error.message);
  }
};

// //  LOGIN
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({
        status: false,
        message: "Email is required",
      });
    }

    if (!password) {
      return res.status(400).json({
        status: false,
        message: "Password is required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: false,
        message: "Please enter a valid email address",
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        status: false,
        message:
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.",
      });
    }

    const user = await Candidate.findOne({ c_email: email.toLowerCase() });

    if (!user) {
      return res.status(400).send({
        status: false,
        message: "User not found",
      });
    }

    //  bcrypt compare
    const isMatch = await bcrypt.compare(password, user.c_password);

    if (!isMatch) {
      return res.status(400).send({
        status: false,
        message: "Invalid password",
      });
    }

    // Generate token for user
    const token = generateTokenUser(user);

    res.status(200).send({
      status: true,
      message: "Login successful",
      token: token,
    });
  } catch (e) {
    console.log(e);
    res.status(500).send({
      status: false,
      message: e.message,
    });
  }
};

exports.loginWithPassword = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        status: false,
        message: "Mobile and Password are required",
      });
    }

    if (mobile.length !== 10) {
      return res.status(400).json({
        status: false,
        message: "Mobile number must be 10 digits",
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        status: false,
        message:
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.",
      });
    }

    const user = await Candidate.findOne({
      c_contact: mobile,
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // Password exists?
    if (!user.c_password) {
      return res.status(400).json({
        status: false,
        message: "Password not created",
        isPass: 0,
      });
    }

    const isMatch = await bcrypt.compare(password, user.c_password);

    if (!isMatch) {
      return res.status(400).json({
        status: false,
        message: "Invalid password",
      });
    }

    const token = generateTokenUser(user);

    return res.status(200).json({
      status: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.c_display_name,
        email: user.c_email,
        mobile: user.c_contact,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.checkMobile = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        status: false,
        message: "Mobile number is required",
      });
    }

    if (mobile.length !== 10) {
      return res.status(400).json({
        status: false,
        message: "Mobile number must be 10 digits",
      });
    }

    const user = await Candidate.findOne({
      c_contact: Number(mobile),
    });

    // ==========================
    // NEW USER
    // ==========================
    if (!user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      const tempUser = await Candidate.create({
        c_contact: Number(mobile),
        c_user_otp: otp,
        c_otp_expiry: new Date(Date.now() + 5 * 60 * 1000),
        c_register_date: new Date(),
      });

      const message = `${otp} is the OTP to authenticate login credential. Do not share with anyone. - The iScale`;

      await sendSms(message, mobile, "1307173398514201568");

      return res.status(200).json({
        status: true,
        isNew: 1,
        message: "OTP sent successfully",
      });
    }

    // ==========================
    // EXISTING USER
    // ==========================

    return res.status(200).json({
      status: true,
      isNew: 0,
      isPass: user.c_password ? 1 : 0,
      message: user.c_password ? "Login with password" : "Create password",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile) {
      return res.status(400).json({
        status: false,
        message: "Mobile number is required",
      });
    }

    if (mobile.length !== 10) {
      return res.status(400).json({
        status: false,
        message: "Mobile number must be 10 digits",
      });
    }

    const user = await Candidate.findOne({
      c_contact: Number(mobile),
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (user.c_user_otp !== otp) {
      return res.status(400).json({
        status: false,
        message: "Invalid OTP",
      });
    }

    if (!user.c_otp_expiry || user.c_otp_expiry < new Date()) {
      return res.status(400).json({
        status: false,
        message: "OTP expired",
      });
    }

    user.c_user_otp = null;
    user.c_otp_expiry = null;

    await user.save();

    const registerToken = generateRegisterToken(mobile);

    return res.status(200).json({
      status: true,
      message: "OTP Verified",
      registerToken,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({
        status: false,
        message: "Mobile number required",
      });
    }

    let user = await Candidate.findOne({
      c_contact: mobile,
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Existing User
    if (user) {
      user.c_user_otp = otp;
      user.c_otp_expiry = new Date(Date.now() + 5 * 60 * 1000);

      await user.save();
    }

    // New User
    else {
      user = await Candidate.create({
        c_contact: mobile,
        c_user_otp: otp,
        c_otp_expiry: new Date(Date.now() + 5 * 60 * 1000),
        c_register_date: new Date(),
      });
    }

    const message = `${otp} is the OTP to authenticate login credential. Do not share with anyone. - The iScale`;

    await sendSms(message, mobile, "1307173398514201568");

    return res.status(200).json({
      status: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// exports.verifyOtp = async (req, res) => {
//   try {
//     const { mobile, otp } = req.body;

//     const user = await Candidate.findOne({
//       c_contact: mobile,
//     });

//     if (!user) {
//       return res.status(404).json({
//         status: false,
//         message: "User not found",
//       });
//     }

//     if (user.c_user_otp !== otp) {
//       return res.status(400).json({
//         status: false,
//         message: "Invalid OTP",
//       });
//     }

//     if (!user.c_otp_expiry || user.c_otp_expiry < new Date()) {
//       return res.status(400).json({
//         status: false,
//         message: "OTP expired",
//       });
//     }

//     // OTP clear
//     user.c_user_otp = null;
//     user.c_otp_expiry = null;

//     await user.save();

//     // Existing Registered User
//     if (user.c_first_name && user.c_email && user.c_password) {
//       const token = generateTokenUser(user);

//       return res.status(200).json({
//         status: true,
//         action: "login",
//         message: "Login successful",
//         token,
//       });
//     }

//     // New User
//     const registerToken = generateRegisterToken(mobile);

//     return res.status(200).json({
//       status: true,
//       action: "register",
//       message: "Complete registration",
//       registerToken,
//     });
//   } catch (error) {
//     return res.status(500).json({
//       status: false,
//       message: error.message,
//     });
//   }
// };

exports.register = async (req, res) => {
  try {
    const { fname, lname, email, password, whatsapp, gender } = req.body;

    const mobile = req.registerUser.mobile;

    if (!fname || !lname || !email || !password || !whatsapp) {
      return res.status(400).json({
        status: false,
        message: "All fields are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: false,
        message: "Please enter a valid email address",
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        status: false,
        message:
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.",
      });
    }

    if (whatsapp.length !== 10) {
      return res.status(400).json({
        status: false,
        message: "Mobile number must be 10 digits",
      });
    }

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        status: false,
        message: "Enter the email in the correct format.",
      });
    }

    if (String(whatsapp).length !== 10) {
      return res.status(400).json({
        status: false,
        message: "The WhatsApp number must be 10 digits long.",
      });
    }

    // Mobile se temporary user find karo
    const user = await Candidate.findOne({
      c_contact: mobile,
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // Already registered check
    if (user.c_first_name) {
      return res.status(400).json({
        status: false,
        message: "User already registered",
      });
    }

    // Email duplicate check
    const existingEmail = await Candidate.findOne({
      c_email: email.toLowerCase(),
    });

    if (existingEmail) {
      return res.status(400).json({
        status: false,
        message: "Email already registered",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Update User
    user.c_first_name = fname;
    user.c_last_name = lname;
    user.c_display_name = fname;

    user.c_email = email.toLowerCase();

    user.c_password = hashedPassword;

    user.c_whatsapp = whatsapp;

    if (gender) {
      user.c_gender = gender;
    }

    user.c_mobile_verified = 1;
    user.c_user_status = 1;
    user.c_email_verified = 0;

    const joinDate = new Date();

    user.c_register_date = joinDate;
    user.candidate_idno = await generateCandidateIdno(joinDate);

    await user.save();

    await sendPasswordEmail(user.c_email, password);

    // Direct Login Token
    const token = generateTokenUser(user);

    return res.status(201).json({
      status: true,
      message: "Registration successful",
      token,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.createPassword = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        status: false,
        message: "Mobile and Password are required",
      });
    }

    if (mobile.length !== 10) {
      return res.status(400).json({
        status: false,
        message: "Mobile number must be 10 digits",
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        status: false,
        message:
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.",
      });
    }

    const user = await Candidate.findOne({
      c_contact: Number(mobile),
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (user.c_password) {
      return res.status(400).json({
        status: false,
        message: "Password already exists",
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    user.c_password = hashPassword;
    user.c_password_update = 1;
    user.c_mobile_verified = 1;
    user.c_user_status = 1;

    await user.save();

    await sendPasswordEmail(user.c_email, password);

    const token = generateTokenUser(user);

    return res.status(200).json({
      status: true,
      message: "Password created successfully",
      token,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// Forget password
exports.sendForgotPasswordOtp = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (mobile.length !== 10) {
      return res.status(400).json({
        status: false,
        message: "Mobile number must be 10 digits",
      });
    }

    const user = await Candidate.findOne({
      c_contact: mobile,
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.c_user_otp = otp;

    user.c_otp_expiry = new Date(Date.now() + 5 * 60 * 1000);

    await user.save();

    // const message =
    //   `${otp} is the OTP to reset your password. Do not share with anyone. - The iScale`;

    const message = `${otp} is the OTP to authenticate login credential. Do not share with anyone. - The iScale`;

    await sendSms(message, mobile, "1307173398514201568");

    // console.log("SMS RESPONSE =>", smsResponse);

    return res.status(200).json({
      status: true,
      message: "OTP sent successfully for forget passsword",
      // smsResponse,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.verifyForgotPasswordOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (mobile.length !== 10) {
      return res.status(400).json({
        status: false,
        message: "Mobile number must be 10 digits",
      });
    }

    const user = await Candidate.findOne({
      c_contact: mobile,
    });

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    if (user.c_user_otp !== otp) {
      return res.status(400).json({
        status: false,
        message: "Invalid OTP",
      });
    }

    if (!user.c_otp_expiry || user.c_otp_expiry < new Date()) {
      return res.status(400).json({
        status: false,
        message: "OTP expired",
      });
    }

    // OTP verified ho gaya
    user.c_user_otp = null;
    user.c_otp_expiry = null;

    await user.save();

    const resetToken = generateResetToken(user);

    return res.status(200).json({
      status: true,
      message: "OTP verified successfully",
      resetToken,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { password, confirm_password } = req.body;

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}$/;

    if (!passwordRegex.test(password)) {
      return res.status(400).json({
        status: false,
        message:
          "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, and one special character.",
      });
    }

    if (password !== confirm_password) {
      return res.status(400).json({
        status: false,
        message: "Password and Confirm Password do not match",
      });
    }

    const user = await Candidate.findById(req.resetUser.id);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.c_password = hashedPassword;

    user.c_password_update = 1;

    user.c_user_otp = null;
    user.c_otp_expiry = null;

    await user.save();

    return res.status(200).json({
      status: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};
