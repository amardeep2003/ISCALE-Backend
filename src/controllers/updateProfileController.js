const mongoose = require("mongoose");
const Candidate = require("../models/candidates");
const bcrypt = require("bcrypt");
const {
  extractUploadedFile,
  deleteFile,
} = require("../services/storageService");

// Fields the frontend renders as read-only; ignored here even if present in
// the body so a direct API call can't bypass the locked UI.
const LOCKED_PROFILE_FIELDS = [
  "c_first_name",
  "c_last_name",
  "c_contact",
  "c_email",
  "firstName",
  "lastName",
  "mobileNumber",
  "email",
];

// Never return these to the client — passwords, OTP codes, and session
// tokens have no business being in a profile response.
const SENSITIVE_PROFILE_FIELDS =
  "-c_password -c_user_otp -c_otp_expiry -c_email_otp -c_email_otp_expiry " +
  "-c_new_email_otp -c_new_email_otp_expiry -c_user_session_token -remember_token";

//  GET PROFILE (prefill data)
// exports.getProfile = async (req, res) => {
//   try {
//     const userId = req.user.id;

//     const user = await Candidate.findById(userId).select("-c_password");

//     if (!user) {
//       return res.status(404).send({
//         status: false,
//         message: "User not found",
//       });
//     }

//     res.send({
//       status: true,
//       data: user,
//     });
//   } catch (e) {
//     res.status(500).send({
//       status: false,
//       message: e.message,
//     });
//   }
// };

exports.getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await Candidate.findById(userId)
      .populate("c_current_country", "m_country_name")
      .populate("c_current_state", "m_state_name")
      .populate("c_current_city", "m_city_city")
      .select(SENSITIVE_PROFILE_FIELDS);

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.json({
      status: true,
      data: user,
    });
  } catch (e) {
    return res.status(500).json({
      status: false,
      message: e.message,
    });
  }
};

// UPDATE PROFILE (partial update)
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // only sent fields will update
    // const updateData = req.body;

    const updateData = { ...req.body };

    for (const field of LOCKED_PROFILE_FIELDS) {
      delete updateData[field];
    }

    // Plain-text location from the app's offline country-state-city
    // dataset / pincode lookup. Kept apart from c_current_country/state/city
    // (ObjectId refs the admin registration flow owns).
    if (updateData.country !== undefined) {
      updateData.c_current_country_name = updateData.country || null;
      delete updateData.country;
    }
    if (updateData.state !== undefined) {
      updateData.c_current_state_name = updateData.state || null;
      delete updateData.state;
    }
    if (updateData.city !== undefined) {
      updateData.c_current_city_name = updateData.city || null;
      delete updateData.city;
    }

    // An empty string means "the frontend has nothing for this field",
    // not "clear it" — the form resubmits every field on every save, so
    // treating "" as a real value would wipe out data (e.g. c_display_name)
    // any time the frontend doesn't have a value to send.
    for (const key of Object.keys(updateData)) {
      if (updateData[key] === "") {
        delete updateData[key];
      }
    }

    if (
      updateData.c_current_country &&
      !mongoose.Types.ObjectId.isValid(updateData.c_current_country)
    ) {
      return res.status(400).json({
        status: false,
        message: "Invalid country id",
      });
    }

    if (
      updateData.c_current_state &&
      !mongoose.Types.ObjectId.isValid(updateData.c_current_state)
    ) {
      return res.status(400).json({
        status: false,
        message: "Invalid state id",
      });
    }

    if (
      updateData.c_current_city &&
      !mongoose.Types.ObjectId.isValid(updateData.c_current_city)
    ) {
      return res.status(400).json({
        status: false,
        message: "Invalid city id",
      });
    }

    // const updatedUser = await Candidate.findByIdAndUpdate(
    //   userId,
    //   { $set: updateData },
    //   { new: true },
    // ).select("-c_password");

    const updatedUser = await Candidate.findByIdAndUpdate(
      userId,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("c_current_country", "country_name")
      .populate("c_current_state", "state_name")
      .populate("c_current_city", "city_name")
      .select(SENSITIVE_PROFILE_FIELDS);

    if (!updatedUser) {
      return res.status(404).send({
        status: false,
        message: "User not found",
      });
    }

    res.send({
      status: true,
      message: "Profile updated successfully",
      data: updatedUser,
    });
  } catch (e) {
    res.status(500).send({
      status: false,
      message: e.message,
    });
  }
};

// change password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.user.id;

    const { currentPassword, newPassword, confirmPassword } = req.body;

    // validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).send({
        status: false,
        message: "All fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).send({
        status: false,
        message: "New password and confirm password do not match",
      });
    }

    // user fetch
    const user = await Candidate.findById(userId);

    if (!user) {
      return res.status(404).send({
        status: false,
        message: "User not found",
      });
    }

    if (user.c_google_id || !user.c_password) {
      return res.status(403).send({
        status: false,
        message: "Password change is not available for Google-authenticated accounts",
      });
    }

    // current password check
    const isMatch = await bcrypt.compare(currentPassword, user.c_password);

    if (!isMatch) {
      return res.status(400).send({
        status: false,
        message: "Current password is incorrect",
      });
    }

    // new password hash
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // user.c_password = hashedPassword;
    // user.c_password_update = 1;

    // await user.save();

    await Candidate.findByIdAndUpdate(userId, {
      c_password: hashedPassword,
      c_password_update: 1,
    });

    res.send({
      status: true,
      message: "Password updated successfully",
    });
  } catch (e) {
    res.status(500).send({
      status: false,
      message: e.message,
    });
  }
};

exports.updateProfileImage = async (req, res) => {
  let uploaded = null;

  if (req.files?.c_profile_image?.length) {
    uploaded = extractUploadedFile(req.files.c_profile_image[0]);
  }

  try {
    const userId = req.user.id;

    if (!uploaded) {
      return res.status(400).json({
        status: false,
        message: "Profile image is required",
      });
    }

    const user = await Candidate.findById(userId);

    if (!user) {
      await deleteFile(uploaded.public_id);

      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // old image
    const oldPublicId = user.c_profile_image_public_id;

    user.c_profile_image = uploaded.url;
    user.c_profile_image_public_id = uploaded.public_id;

    await user.save();

    // save successful hone ke baad purana delete
    if (oldPublicId) {
      await deleteFile(oldPublicId);
    }

    return res.status(200).json({
      status: true,
      message: "Profile image updated successfully",
      image: user.c_profile_image,
    });
  } catch (err) {
    // agar save fail ho gaya to naya upload delete
    if (uploaded?.public_id) {
      await deleteFile(uploaded.public_id);
    }

    return res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

exports.getProfileImage = async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.user.id).select(
      "c_first_name c_last_name c_display_name c_contact c_profile_image",
    );

    if (!candidate) {
      return res.status(404).json({
        status: false,
        message: "Candidate not found",
      });
    }

    const name =
      candidate.c_display_name ||
      `${candidate.c_first_name || ""} ${candidate.c_last_name || ""}`.trim();

    return res.status(200).json({
      status: true,
      data: {
        name,
        contact: candidate.c_contact,
        image: candidate.c_profile_image,
      },
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// Mobile Apis=============================================================================================================================

exports.appUpdateUserProfileApp = async (req, res) => {
  try {
    const userId = req.user.id;

    const {
      user_name,
      user_bio,
      occupation,
      address,
      pincode,
      city,
      state,
      date_of_birth,
      gender,
      alternate_contact,
      email,
      parent_name,
    } = req.body;

    const updateData = {};

    // ==========================================
    // Only update if field is sent
    // ==========================================

    if (user_name !== undefined) {
      const nameParts = user_name.trim().split(" ");

      updateData.c_first_name = nameParts[0] || "";
      updateData.c_last_name = nameParts.slice(1).join(" ") || "";
      updateData.c_display_name = user_name;
    }

    if (user_bio !== undefined) {
      updateData.c_bio = user_bio;
    }

    if (occupation !== undefined) {
      updateData.m_occupation = occupation;
    }

    if (address !== undefined) {
      updateData.c_current_address1 = address;
    }

    if (pincode !== undefined) {
      updateData.c_current_pincode = pincode;
    }

    if (gender !== undefined) {
      updateData.c_gender = gender;
    }

    if (alternate_contact !== undefined) {
      updateData.c_alt_contact = alternate_contact;
    }

    if (email !== undefined) {
      updateData.c_email = email;
    }

    if (parent_name !== undefined) {
      updateData.c_guardian = parent_name;
    }

    if (date_of_birth !== undefined) {
      updateData.c_dob = new Date(date_of_birth);
    }

    // ==========================================
    // State Lookup
    // ==========================================

    if (state) {
      const State = require("../models/state");

      const stateData = await State.findOne({
        state_name: { $regex: `^${state}$`, $options: "i" },
      });

      if (stateData) {
        updateData.c_current_state = stateData._id;
      }
    }

    // ==========================================
    // City Lookup
    // ==========================================

    if (city) {
      const City = require("../models/city");

      const cityData = await City.findOne({
        city_name: { $regex: `^${city}$`, $options: "i" },
      });

      if (cityData) {
        updateData.c_current_city = cityData._id;
      }
    }

    const user = await Candidate.findByIdAndUpdate(
      userId,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      },
    )
      .populate("c_current_state", "state_name")
      .populate("c_current_city", "city_name");

    if (!user) {
      return res.status(404).json({
        response: "failed",
        message: "User not found",
      });
    }

    return res.status(200).json({
      response: "success",
      message: "Successfully Update",
      users: [
        {
          user_id: user.candidate_idno || "",

          user_name: `${user.c_first_name || ""} ${
            user.c_last_name || ""
          }`.trim(),

          user_contact: user.c_contact || "",

          alt_contact: user.c_alt_contact || "",

          user_email: user.c_email || "",

          user_gender: user.c_gender || "",

          c_profile_image: user.c_profile_image || "",

          user_dob: user.c_dob ? user.c_dob.toISOString().split("T")[0] : "",

          user_state: user.c_current_state?.state_name || "",

          user_city: user.c_current_city?.city_name || "",

          user_pincode: user.c_current_pincode || "",

          user_address: user.c_current_address1 || "",

          user_status: user.c_user_status || "",

          user_fcm_id: user.c_fcm_id || "",

          parent_name: user.c_guardian || "",

          user_occupation: user.m_occupation || "",

          c_bio: user.c_bio || "",
        },
      ],
    });
  } catch (error) {
    return res.status(500).json({
      response: "failed",
      message: error.message,
    });
  }
};
