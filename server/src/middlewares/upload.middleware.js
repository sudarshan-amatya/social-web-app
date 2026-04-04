import multer from "multer"

const storage = multer.memoryStorage()

const multerUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
      return
    }

    cb(new Error("Only image files are allowed"))
  },
})

export function uploadSingleImage(req, res, next) {
  multerUpload.single("image")(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message })
    }

    next()
  })
}