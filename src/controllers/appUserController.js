// controllers/candidateController.js

const Candidate = require("../models/candidates");
const State = require("../models/state");
const City = require("../models/city");
const Enrollment = require("../models/course_enrollment");

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// ======================================
// CHECK VALID VALUE
// ======================================

const isValidValue = (value) => {
  return (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    value !== "null" &&
    value !== "undefined"
  );
};

// ======================================
// GET ALL USERS
// ======================================

const getAllUsers = async (req, res) => {
  try {
    let {
      page = 1,
      limit = 50,
      search = "",
      from_date,
      to_date,
      user_status,
      country,
      state,
      city,
    } = req.query;

    page = Number(page);
    limit = Number(limit);

    const filter = {};

    // ======================================
    // SEARCH
    // ======================================

    // if (isValidValue(search)) {
    //   filter.$or = [
    //     {
    //       c_display_name: {
    //         $regex: search,
    //         $options: "i",
    //       },
    //     },
    //     {
    //       c_email: {
    //         $regex: search,
    //         $options: "i",
    //       },
    //     },
    //     // {
    //     //   c_contact: {
    //     //     $regex: search,
    //     //     $options: "i",
    //     //   },
    //     // },
    //   ];
    // }

    if (isValidValue(search)) {
      filter.$or = [
        {
          c_display_name: {
            $regex: search,
            $options: "i",
          },
        },
        {
          c_email: {
            $regex: search,
            $options: "i",
          },
        },
        {
          $expr: {
            $regexMatch: {
              input: { $toString: "$c_contact" },
              regex: search,
            },
          },
        },
      ];
    }

    // ======================================
    // USER STATUS FILTER
    // ======================================

    if (isValidValue(user_status)) {
      filter.c_user_status = Number(user_status);
    }

    // ======================================
    // DATE FILTER
    // ======================================

    if (isValidValue(from_date) || isValidValue(to_date)) {
      filter.c_register_date = {};

      if (isValidValue(from_date)) {
        filter.c_register_date.$gte = new Date(from_date);
      }

      if (isValidValue(to_date)) {
        const toDate = new Date(to_date);
        toDate.setHours(23, 59, 59, 999);

        filter.c_register_date.$lte = toDate;
      }
    }

    // ======================================
    // LOCATION FILTER (plain-text country/state/city
    // entered via the candidate app's location picker)
    // ======================================

    if (isValidValue(country)) {
      filter.c_current_country_name = { $regex: `^${country}$`, $options: "i" };
    }

    if (isValidValue(state)) {
      filter.c_current_state_name = { $regex: `^${state}$`, $options: "i" };
    }

    if (isValidValue(city)) {
      filter.c_current_city_name = { $regex: `^${city}$`, $options: "i" };
    }

    // ======================================
    // TOTAL
    // ======================================

    const total = await Candidate.countDocuments(filter);

    // ======================================
    // GET DATA
    // ======================================

    const users = await Candidate.find(filter)
      .select(
        `
        c_first_name
        c_last_name
        c_display_name
        c_email
        c_contact
        c_register_date
        c_user_status
        c_current_country_name
        c_current_state_name
        c_current_city_name
      `,
      )
      .sort({ c_register_date: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return res.status(200).json({
      status: true,
      message: "Users fetched successfully",
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data: users,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// ======================================
// GET SINGLE USER
// ======================================

const getSingleUser = async (req, res) => {
  try {
    const { id } = req.params;

    // ======================================
    // VALIDATE ID
    // ======================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid user id",
      });
    }

    // ======================================
    // FIND USER
    // ======================================

    const user = await Candidate.findById(id)
      .populate("c_current_state", "m_state_name")
      .populate("c_current_city", "m_city_city")
      .populate("c_user_refer_by", "kh_admin_name kh_admin_phone");

    if (!user) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      status: true,
      data: user,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// ======================================
// EDIT USER
// ======================================

const editUser = async (req, res) => {
  try {
    const { id } = req.params;

    // ======================================
    // VALIDATE ID
    // ======================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid user id",
      });
    }

    // ======================================
    // CHECK USER
    // ======================================

    const existingUser = await Candidate.findById(id);

    if (!existingUser) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // ======================================
    // UPDATE OBJECT
    // ======================================

    const updateData = {};

    // ======================================
    // NAME
    // ======================================

    if (isValidValue(req.body.c_first_name)) {
      updateData.c_first_name = req.body.c_first_name;
    }

    if (isValidValue(req.body.c_last_name)) {
      updateData.c_last_name = req.body.c_last_name;
    }

    if (isValidValue(req.body.c_display_name)) {
      updateData.c_display_name = req.body.c_display_name;
    }

    // ======================================
    // EMAIL
    // ======================================

    if (isValidValue(req.body.c_email)) {
      updateData.c_email = req.body.c_email;
    }

    // ======================================
    // EMAIL VERIFIED
    // ======================================

    if (isValidValue(req.body.c_email_verified)) {
      updateData.c_email_verified = Number(req.body.c_email_verified);
    }

    // ======================================
    // CONTACT
    // ======================================

    if (isValidValue(req.body.c_contact)) {
      updateData.c_contact = req.body.c_contact;
    }

    // ======================================
    // MOBILE VERIFIED
    // ======================================

    if (isValidValue(req.body.c_mobile_verified)) {
      updateData.c_mobile_verified = Number(req.body.c_mobile_verified);
    }

    // ======================================
    // ALT CONTACT
    // ======================================

    if (isValidValue(req.body.c_alt_contact)) {
      updateData.c_alt_contact = req.body.c_alt_contact;
    }

    // ======================================
    // STATUS
    // ======================================

    if (isValidValue(req.body.c_user_status)) {
      updateData.c_user_status = Number(req.body.c_user_status);
    }

    // ======================================
    // GENDER
    // ======================================

    if (isValidValue(req.body.c_gender)) {
      updateData.c_gender = req.body.c_gender;
    }

    // ======================================
    // DOB
    // ======================================

    if (isValidValue(req.body.c_dob)) {
      updateData.c_dob = req.body.c_dob;
    }

    // ======================================
    // PINCODE
    // ======================================

    if (isValidValue(req.body.c_current_pincode)) {
      updateData.c_current_pincode = req.body.c_current_pincode;
    }

    // ======================================
    // ADDRESS
    // ======================================

    if (isValidValue(req.body.c_current_address1)) {
      updateData.c_current_address1 = req.body.c_current_address1;
    }

    // ======================================
    // STATE
    // ======================================

    if (isValidValue(req.body.c_current_state)) {
      if (req.body.c_current_state !== "others") {
        if (!mongoose.Types.ObjectId.isValid(req.body.c_current_state)) {
          return res.status(400).json({
            status: false,
            message: "Invalid state id",
          });
        }

        const stateData = await State.findById(req.body.c_current_state);

        if (!stateData) {
          return res.status(404).json({
            status: false,
            message: "State not found",
          });
        }

        updateData.c_current_state = req.body.c_current_state;
      } else {
        updateData.c_current_state = "others";
      }
    }

    // ======================================
    // CITY
    // ======================================

    if (isValidValue(req.body.c_current_city)) {
      if (req.body.c_current_city !== "others") {
        if (!mongoose.Types.ObjectId.isValid(req.body.c_current_city)) {
          return res.status(400).json({
            status: false,
            message: "Invalid city id",
          });
        }

        const cityData = await City.findById(req.body.c_current_city);

        if (!cityData) {
          return res.status(404).json({
            status: false,
            message: "City not found",
          });
        }

        updateData.c_current_city = req.body.c_current_city;

        // AUTO STATE
        updateData.c_current_state = cityData.m_city_state;
      } else {
        updateData.c_current_city = "others";
      }
    }

    // ======================================
    // REFERED BY
    // ======================================

    if (isValidValue(req.body.c_user_refer_by)) {
      updateData.c_user_refer_by = req.body.c_user_refer_by;
    }

    // ======================================
    // PROFILE IMAGE
    // ======================================

    if (req.files?.c_profile_image?.[0]?.path) {
      updateData.c_profile_image = req.files.c_profile_image[0].path;
    }

    // ======================================
    // PASSWORD UPDATE
    // ======================================

    if (
      isValidValue(req.body.password) ||
      isValidValue(req.body.confirm_password)
    ) {
      if (req.body.password !== req.body.confirm_password) {
        return res.status(400).json({
          status: false,
          message: "Password and confirm password does not match",
        });
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);

      updateData.c_password = hashedPassword;
      updateData.c_password_update = 1;
    }

    // ======================================
    // UPDATE USER
    // ======================================

    const updatedUser = await Candidate.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    return res.status(200).json({
      status: true,
      message: "User updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

const searchUsersForDropdown = async (req, res) => {
  try {
    let { keyword = "", page = 1, limit = 10 } = req.query;

    page = Number(page);
    limit = Number(limit);

    const filter = {};

    // ======================================
    // SEARCH
    // ======================================

    if (keyword && keyword.trim() !== "") {
      filter.$or = [
        {
          c_first_name: {
            $regex: keyword,
            $options: "i",
          },
        },

        {
          c_last_name: {
            $regex: keyword,
            $options: "i",
          },
        },

        {
          c_display_name: {
            $regex: keyword,
            $options: "i",
          },
        },

        {
          c_email: {
            $regex: keyword,
            $options: "i",
          },
        },
      ];
    }

    // ======================================
    // TOTAL COUNT
    // ======================================

    const totalRecords = await Candidate.countDocuments(filter);

    // ======================================
    // GET USERS
    // ======================================

    const users = await Candidate.find(filter)
      .select(
        `
        c_first_name
        c_last_name
        c_display_name
        c_email
      `,
      )
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ createdAt: -1 });

    // ======================================
    // FORMAT DATA
    // ======================================

    const finalData = users.map((user) => {
      return {
        _id: user._id,

        full_name:
          user.c_display_name ||
          `${user.c_first_name || ""} ${user.c_last_name || ""}`.trim(),

        first_name: user.c_first_name || "",

        last_name: user.c_last_name || "",

        email: user.c_email || "",
      };
    });

    // ======================================
    // RESPONSE
    // ======================================

    return res.status(200).send({
      status: true,

      pagination: {
        currentPage: page,
        perPage: limit,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
      },

      data: finalData,
    });
  } catch (error) {
    return res.status(500).send({
      status: false,
      message: error.message,
    });
  }
};

// ======================================
// DELETE USER
// ======================================

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // ======================================
    // VALIDATE ID
    // ======================================

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        status: false,
        message: "Invalid user id",
      });
    }

    // ======================================
    // CHECK USER
    // ======================================

    const candidate = await Candidate.findById(id);

    if (!candidate) {
      return res.status(404).json({
        status: false,
        message: "User not found",
      });
    }

    // ======================================
    // DELETE ENROLLMENTS
    // ======================================

    const deletedEnrollments = await Enrollment.deleteMany({
      user_id: id,
    });

    // ======================================
    // DELETE USER
    // ======================================

    await Candidate.findByIdAndDelete(id);

    return res.status(200).json({
      status: true,
      message: "User deleted successfully",
      deleted_enrollments: deletedEnrollments.deletedCount,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

module.exports = {
  getAllUsers,
  getSingleUser,
  editUser,
  deleteUser,
  searchUsersForDropdown,
};
