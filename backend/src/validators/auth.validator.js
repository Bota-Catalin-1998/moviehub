import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must have at least 2 characters"),
  email: z.email("Invalid email address"),
  password: z.string().min(6, "Password must have at least 6 characters")
});

export const verifyOtpSchema = z.object({
  email: z.email("Invalid email address"),
  otp: z.string().min(6, "OTP must have 6 digits").max(6, "OTP must have 6 digits")
});

export const forgotPasswordSchema = z.object({
  email: z.email("Invalid email address")
});

export const resetPasswordSchema = z.object({
  email: z.email("Invalid email address"),
  resetCode: z.string().min(6, "Reset code must have 6 digits").max(6, "Reset code must have 6 digits"),
  newPassword: z.string().min(6, "Password must have at least 6 characters")
});