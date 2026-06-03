import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import {
  loginSchema,
  registerSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} from "../validators/auth.validator.js";
import { logAction } from "../utils/logAction.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_change_me";

const otpStore = new Map();
const resetCodeStore = new Map();

function generateSixDigitCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function generateToken(user, permissions) {
  return jwt.sign(
    {
      userId: user.id,
      role: user.role.name,
      permissions
    },
    JWT_SECRET,
    {
      expiresIn: "15m"
    }
  );
}

function getPermissions(user) {
  return user.role.rolePermissions.map((rp) => rp.permission.name);
}

async function findUserWithRole(email) {
  return prisma.user.findUnique({
    where: { email },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true
            }
          }
        }
      }
    }
  });
}

async function safeLogAction(data, label) {
  try {
    await logAction(data);
  } catch (error) {
    console.error(`Could not save ${label} log:`, error.message);
  }
}

export const register = async (req, res) => {
  const validationResult = registerSchema.safeParse(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: validationResult.error.issues
    });
  }

  const { name, email, password } = validationResult.data;

  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    return res.status(409).json({
      error: "Email already exists"
    });
  }

  const userRole = await prisma.role.findUnique({
    where: { name: "USER" }
  });

  if (!userRole) {
    return res.status(500).json({
      error: "USER role not found"
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      roleId: userRole.id
    },
    include: {
      role: true
    }
  });

  await safeLogAction(
    {
      userId: user.id,
      groupId: user.role.name,
      actionInformation: "REGISTER_SUCCESS"
    },
    "register"
  );

  res.status(201).json({
    message: "Register successful",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name
    }
  });
};

// Login vechi, păstrat pentru compatibilitate cu Bronze/teste
export const login = async (req, res) => {
  const validationResult = loginSchema.safeParse(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: validationResult.error.issues
    });
  }

  const { email, password } = validationResult.data;

  const user = await findUserWithRole(email);

  if (!user) {
    return res.status(401).json({
      error: "Invalid email or password"
    });
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    return res.status(401).json({
      error: "Invalid email or password"
    });
  }

  const permissions = getPermissions(user);
  const token = generateToken(user, permissions);

  await safeLogAction(
    {
      userId: user.id,
      groupId: user.role.name,
      actionInformation: "LOGIN_SUCCESS"
    },
    "login"
  );

  res.json({
    message: "Login successful",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions
    }
  });
};

// Silver: pasul 1 din login cu OTP
export const startOtpLogin = async (req, res) => {
  const validationResult = loginSchema.safeParse(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: validationResult.error.issues
    });
  }

  const { email, password } = validationResult.data;

  const user = await findUserWithRole(email);

  if (!user) {
    return res.status(401).json({
      error: "Invalid email or password"
    });
  }

  const passwordMatches = await bcrypt.compare(password, user.password);

  if (!passwordMatches) {
    return res.status(401).json({
      error: "Invalid email or password"
    });
  }

  const otp = generateSixDigitCode();

  otpStore.set(email, {
    otp,
    userId: user.id,
    expiresAt: Date.now() + 5 * 60 * 1000
  });

  await safeLogAction(
    {
      userId: user.id,
      groupId: user.role.name,
      actionInformation: "OTP_GENERATED"
    },
    "otp"
  );

  res.json({
    message: "OTP generated successfully",
    otpRequired: true,

    // Pentru demo la laborator. În producție nu se trimite codul în response.
    devOtp: otp
  });
};

// Silver: pasul 2 din login cu OTP
export const verifyOtpLogin = async (req, res) => {
  const validationResult = verifyOtpSchema.safeParse(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: validationResult.error.issues
    });
  }

  const { email, otp } = validationResult.data;

  const otpData = otpStore.get(email);

  if (!otpData) {
    return res.status(401).json({
      error: "OTP not found. Please start login again."
    });
  }

  if (Date.now() > otpData.expiresAt) {
    otpStore.delete(email);

    return res.status(401).json({
      error: "OTP expired. Please start login again."
    });
  }

  if (otpData.otp !== otp) {
    return res.status(401).json({
      error: "Invalid OTP"
    });
  }

  const user = await findUserWithRole(email);

  if (!user) {
    return res.status(401).json({
      error: "User not found"
    });
  }

  const permissions = getPermissions(user);
  const token = generateToken(user, permissions);

  otpStore.delete(email);

  await safeLogAction(
    {
      userId: user.id,
      groupId: user.role.name,
      actionInformation: "OTP_LOGIN_SUCCESS"
    },
    "otp-login"
  );

  res.json({
    message: "OTP login successful",
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      permissions
    }
  });
};

// Silver: cere cod de resetare parolă
export const forgotPassword = async (req, res) => {
  const validationResult = forgotPasswordSchema.safeParse(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: validationResult.error.issues
    });
  }

  const { email } = validationResult.data;

  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: true
    }
  });

  if (!user) {
    return res.status(404).json({
      error: "User not found"
    });
  }

  const resetCode = generateSixDigitCode();

  resetCodeStore.set(email, {
    resetCode,
    userId: user.id,
    expiresAt: Date.now() + 10 * 60 * 1000
  });

  await safeLogAction(
    {
      userId: user.id,
      groupId: user.role.name,
      actionInformation: "PASSWORD_RESET_CODE_GENERATED"
    },
    "password-reset-code"
  );

  res.json({
    message: "Password reset code generated",

    // Pentru demo la laborator. În producție nu se trimite codul în response.
    devResetCode: resetCode
  });
};

// Silver: schimbă parola pe baza codului de resetare
export const resetPassword = async (req, res) => {
  const validationResult = resetPasswordSchema.safeParse(req.body);

  if (!validationResult.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: validationResult.error.issues
    });
  }

  const { email, resetCode, newPassword } = validationResult.data;

  const resetData = resetCodeStore.get(email);

  if (!resetData) {
    return res.status(401).json({
      error: "Reset code not found. Please request a new one."
    });
  }

  if (Date.now() > resetData.expiresAt) {
    resetCodeStore.delete(email);

    return res.status(401).json({
      error: "Reset code expired. Please request a new one."
    });
  }

  if (resetData.resetCode !== resetCode) {
    return res.status(401).json({
      error: "Invalid reset code"
    });
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.update({
    where: { email },
    data: {
      password: hashedPassword
    },
    include: {
      role: true
    }
  });

  resetCodeStore.delete(email);

  await safeLogAction(
    {
      userId: user.id,
      groupId: user.role.name,
      actionInformation: "PASSWORD_RESET_SUCCESS"
    },
    "password-reset"
  );

  res.json({
    message: "Password reset successful"
  });
};