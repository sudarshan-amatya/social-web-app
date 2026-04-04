import { Router } from "express"
import { requireAuth } from "../middlewares/auth.middleware.js"
import { uploadSingleImage } from "../middlewares/upload.middleware.js"
import { uploadImage } from "../controllers/upload.controller.js"

const router = Router()

router.post("/image", requireAuth, uploadSingleImage, uploadImage)

export default router