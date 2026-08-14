const Gallery = require("../models/phoneImage");
const { v2: cloudinary } = require("cloudinary");
const { extractUploadedFile,deleteFile } = require("../services/storageService");

// Upload Image
const uploadImage = async (req, res) => {
  // console.log("req.file =>");
  // console.log(req.file);
  try {
    if (!req.file) {
      return res.status(400).json({
        status: false,
        message: "Image is required",
      });
    }

    // const image = await Gallery.create({
    //   image: req.file.path,
    //   public_id: req.file.filename,
    // });

    const uploaded = extractUploadedFile(req.file);

    const image = await Gallery.create({
      image: uploaded.url,
      public_id: uploaded.public_id,
      title: req.body.title || "",
    });

    // console.log(req.file);

    return res.status(201).json({
      status: true,
      message: "Image uploaded successfully",
      data: image,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// Get All Images
const getAllImages = async (req, res) => {
  try {
    const images = await Gallery.find().sort({ createdAt: -1 });

    return res.status(200).json({
      status: true,
      count: images.length,
      data: images,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// Get Single Image
const getImageById = async (req, res) => {
  try {
    const image = await Gallery.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        status: false,
        message: "Image not found",
      });
    }

    return res.status(200).json({
      status: true,
      data: image,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// Update Image
const updateImage = async (req, res) => {
  try {
    const image = await Gallery.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        status: false,
        message: "Image not found",
      });
    }

    if (req.body.title !== undefined) {
      image.title = req.body.title;
    }

    if (req.file) {
      await deleteFile(image.public_id);

      const uploaded = extractUploadedFile(req.file);
      image.image = uploaded.url;
      image.public_id = uploaded.public_id;
    }

    await image.save();

    return res.status(200).json({
      status: true,
      message: "Image updated successfully",
      data: image,
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

// Delete Image
// const deleteImage = async (req, res) => {
//   try {
//     const image = await Gallery.findById(req.params.id);

//     if (!image) {
//       return res.status(404).json({
//         status: false,
//         message: "Image not found",
//       });
//     }

//     await Gallery.findByIdAndDelete(req.params.id);

//     return res.status(200).json({
//       status: true,
//       message: "Image deleted successfully",
//     });
//   } catch (error) {
//     return res.status(500).json({
//       status: false,
//       message: error.message,
//     });
//   }
// };

const deleteImage = async (req, res) => {
  try {
    const image = await Gallery.findById(req.params.id);

    if (!image) {
      return res.status(404).json({
        status: false,
        message: "Image not found",
      });
    }

    // Cloudinary se delete
    // await cloudinary.uploader.destroy(image.public_id);
    await deleteFile(image.public_id);

    // MongoDB se delete
    await Gallery.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      status: true,
      message: "Image deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: error.message,
    });
  }
};

module.exports = {
  uploadImage,
  getAllImages,
  getImageById,
  updateImage,
  deleteImage,
};
