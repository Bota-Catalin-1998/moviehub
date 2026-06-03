import express from "express";
import {
  login,
  register,
  startOtpLogin,
  verifyOtpLogin,
  forgotPassword,
  resetPassword
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/register", register);

// Bronze login, îl păstrăm ca să nu stricăm testele existente
router.post("/login", login);

// Silver OTP login
router.post("/login/start", startOtpLogin);
router.post("/login/verify-otp", verifyOtpLogin);

// Silver password recovery
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;