const uploadImage = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({
      status: 'fail',
      message: 'No image uploaded',
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      url: req.file.path,
      publicId: req.file.filename,
    },
  });
};

module.exports = {
  uploadImage,
};
