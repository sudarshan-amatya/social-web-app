import express from "express";
import { register, login, logout, getMe } from "../controllers/auth.controller.js";
import { validateBody } from "../middlewares/validate-body.js";
import { registerSchema } from "../validators/auth.validation.js";
import { requireAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", login);
router.post("/logout", logout);
router.get("/me", requireAuth, getMe);

export default router;