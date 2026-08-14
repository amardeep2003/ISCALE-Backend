const Testimonial = require("../models/stdtestimonial");
const fs = require("fs");

const addTestimonial = async (req, res) => {
  try {
    const { m_st_url, m_st_status } = req.body;
    const videoFiles = req.files?.m_st_video || [];
    const status = m_st_status ? Number(m_st_status) : 1;

    if (videoFiles.length === 0) {
      // No video files - fall back to a single URL-only testimonial, same as before.
      const saved = await new Testimonial({
        m_st_video: null,
        m_st_url,
        m_st_status: status,
      }).save();

      return res.status(201).json({
        status: true,
        message: "Testimonial added",
        data: [saved],
      });
    }

    // Each uploaded video becomes its own testimonial document.
    const created = await Testimonial.insertMany(
      videoFiles.map((file) => ({
        m_st_video: file.path,
        m_st_url: m_st_url || null,
        m_st_status: status,
      })),
    );

    res.status(201).json({
      status: true,
      message: `${created.length} testimonial${created.length > 1 ? "s" : ""} added`,
      data: created,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

const getAllTestimonials = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;

    page = parseInt(page);
    limit = parseInt(limit);

    const total = await Testimonial.countDocuments();

    const data = await Testimonial.find()
      .sort({ _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    res.json({
      status: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      data,
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

const updateTestimonial = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await Testimonial.findById(id);

    if (!data) {
      return res.status(404).json({
        status: false,
        message: "Not found",
      });
    }

    // URL update
    if (req.body.m_st_url !== undefined && req.body.m_st_url !== "") {
      data.m_st_url = req.body.m_st_url;
    }

    // Status update
    if (req.body.m_st_status !== undefined && req.body.m_st_status !== "") {
      data.m_st_status = Number(req.body.m_st_status);
    }

    // Video update
    if (req.files?.m_st_video) {
      if (data.m_st_video && fs.existsSync(data.m_st_video)) {
        fs.unlinkSync(data.m_st_video);
      }

      data.m_st_video = req.files.m_st_video[0].path;
    }

    data.m_st_updated_on = new Date();

    await data.save();

    res.json({
      status: true,
      message: "Updated successfully",
      data,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

const deleteTestimonial = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await Testimonial.findById(id);
    if (!data) {
      return res.status(404).json({
        status: false,
        message: "Not found",
      });
    }

    if (data.m_st_video && fs.existsSync(data.m_st_video)) {
      fs.unlinkSync(data.m_st_video);
    }

    await Testimonial.findByIdAndDelete(id);

    res.json({
      status: true,
      message: "Deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

const changeTestimonialStatus = async (req, res) => {
  try {
    const testimonial = await Testimonial.findById(req.params.id);

    if (!testimonial) {
      return res.status(404).json({
        status: false,
        message: "Not found",
      });
    }

    testimonial.m_st_status = testimonial.m_st_status === 1 ? 0 : 1;

    testimonial.m_st_updated_on = new Date();

    await testimonial.save();

    res.json({
      status: true,
      message: "Status changed successfully",
      data: testimonial,
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      message: err.message,
    });
  }
};

module.exports = {
  addTestimonial,
  getAllTestimonials,
  updateTestimonial,
  deleteTestimonial,
  changeTestimonialStatus,
};
