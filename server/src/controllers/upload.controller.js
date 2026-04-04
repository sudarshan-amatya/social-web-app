import { cloudinary } from "../config/cloudinary.js"

function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error)
        return
      }

      resolve(result)
    })

    stream.end(buffer)
  })
}

export async function uploadImage(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Image file is required" })
    }

    const type = req.query.type === "avatar" ? "avatars" : "posts"

    const result = await uploadBuffer(req.file.buffer, {
      folder: `social-web-app/${type}`,
      resource_type: "image",
    })

    return res.json({
      message: "Image uploaded successfully",
      imageUrl: result.secure_url,
      publicId: result.public_id,
    })
  } catch (error) {
    console.error("UPLOAD_IMAGE_ERROR", error)
    return res.status(500).json({ message: "Could not upload image" })
  }
}