import { Router } from "express";
import {
    register,
    login,
    logout,
    refresh,
    verifyEmail,
    forgotPassword,
    resetPassword,
} from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", protect, logout);
router.post("/refresh", refresh);
router.get("/verify-email", verifyEmail);          // ?token=xxx
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;