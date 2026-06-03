import request from "supertest";
import { describe, expect, it, beforeEach, afterAll } from "vitest";
import app from "../app.js";
import prisma from "../lib/prisma.js";

let uniqueEmail = "";

async function seedUserRole() {
  await prisma.actionLog.deleteMany();
  await prisma.observationUser.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  const userRole = await prisma.role.create({
    data: {
      name: "USER"
    }
  });

  const readPermission = await prisma.permission.create({
    data: {
      name: "READ_MOVIES"
    }
  });

  await prisma.rolePermission.create({
    data: {
      roleId: userRole.id,
      permissionId: readPermission.id
    }
  });
}

async function registerTestUser(email, password = "test123") {
  return request(app)
    .post("/auth/register")
    .send({
      name: "Test User",
      email,
      password
    });
}

describe("Auth API", () => {
  beforeEach(async () => {
    uniqueEmail = `test_${Date.now()}_${Math.floor(Math.random() * 10000)}@moviehub.com`;
    await seedUserRole();
  });

  afterAll(async () => {
    await prisma.actionLog.deleteMany();
    await prisma.observationUser.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.user.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();
    await prisma.$disconnect();
  });

  it("registers a new user", async () => {
    const response = await registerTestUser(uniqueEmail);

    expect(response.status).toBe(201);
    expect(response.body.message).toBe("Register successful");
    expect(response.body.user.email).toBe(uniqueEmail);
    expect(response.body.user.role).toBe("USER");
    expect(response.body.user.password).toBeUndefined();
  });

  it("does not register duplicate email", async () => {
    await registerTestUser(uniqueEmail);

    const response = await request(app)
      .post("/auth/register")
      .send({
        name: "Test User Duplicate",
        email: uniqueEmail,
        password: "test123"
      });

    expect(response.status).toBe(409);
    expect(response.body.error).toBe("Email already exists");
  });

  it("logs in with valid credentials using the old Bronze login", async () => {
    await registerTestUser(uniqueEmail);

    const response = await request(app)
      .post("/auth/login")
      .send({
        email: uniqueEmail,
        password: "test123"
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Login successful");
    expect(response.body.token).toBeDefined();
    expect(response.body.user.email).toBe(uniqueEmail);
    expect(response.body.user.role).toBe("USER");
  });

  it("does not login with wrong password", async () => {
    await registerTestUser(uniqueEmail);

    const response = await request(app)
      .post("/auth/login")
      .send({
        email: uniqueEmail,
        password: "wrongpassword"
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid email or password");
  });

  it("does not login with invalid email format", async () => {
    const response = await request(app)
      .post("/auth/login")
      .send({
        email: "not-an-email",
        password: "test123"
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Validation failed");
  });

  it("starts OTP login after valid email and password", async () => {
    await registerTestUser(uniqueEmail);

    const response = await request(app)
      .post("/auth/login/start")
      .send({
        email: uniqueEmail,
        password: "test123"
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("OTP generated successfully");
    expect(response.body.otpRequired).toBe(true);
    expect(response.body.devOtp).toBeDefined();
    expect(response.body.devOtp).toHaveLength(6);
  });

  it("verifies OTP and returns JWT token", async () => {
    await registerTestUser(uniqueEmail);

    const startResponse = await request(app)
      .post("/auth/login/start")
      .send({
        email: uniqueEmail,
        password: "test123"
      });

    const otp = startResponse.body.devOtp;

    const verifyResponse = await request(app)
      .post("/auth/login/verify-otp")
      .send({
        email: uniqueEmail,
        otp
      });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body.message).toBe("OTP login successful");
    expect(verifyResponse.body.token).toBeDefined();
    expect(verifyResponse.body.user.email).toBe(uniqueEmail);
    expect(verifyResponse.body.user.role).toBe("USER");
    expect(verifyResponse.body.user.permissions).toContain("READ_MOVIES");
  });

  it("rejects invalid OTP", async () => {
    await registerTestUser(uniqueEmail);

    await request(app)
      .post("/auth/login/start")
      .send({
        email: uniqueEmail,
        password: "test123"
      });

    const response = await request(app)
      .post("/auth/login/verify-otp")
      .send({
        email: uniqueEmail,
        otp: "000000"
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid OTP");
  });

  it("does not allow reusing the same OTP", async () => {
    await registerTestUser(uniqueEmail);

    const startResponse = await request(app)
      .post("/auth/login/start")
      .send({
        email: uniqueEmail,
        password: "test123"
      });

    const otp = startResponse.body.devOtp;

    const firstVerify = await request(app)
      .post("/auth/login/verify-otp")
      .send({
        email: uniqueEmail,
        otp
      });

    expect(firstVerify.status).toBe(200);

    const secondVerify = await request(app)
      .post("/auth/login/verify-otp")
      .send({
        email: uniqueEmail,
        otp
      });

    expect(secondVerify.status).toBe(401);
    expect(secondVerify.body.error).toBe("OTP not found. Please start login again.");
  });

  it("generates password reset code", async () => {
    await registerTestUser(uniqueEmail);

    const response = await request(app)
      .post("/auth/forgot-password")
      .send({
        email: uniqueEmail
      });

    expect(response.status).toBe(200);
    expect(response.body.message).toBe("Password reset code generated");
    expect(response.body.devResetCode).toBeDefined();
    expect(response.body.devResetCode).toHaveLength(6);
  });

  it("resets password and allows login with the new password", async () => {
    await registerTestUser(uniqueEmail);

    const forgotResponse = await request(app)
      .post("/auth/forgot-password")
      .send({
        email: uniqueEmail
      });

    const resetCode = forgotResponse.body.devResetCode;

    const resetResponse = await request(app)
      .post("/auth/reset-password")
      .send({
        email: uniqueEmail,
        resetCode,
        newPassword: "newpass123"
      });

    expect(resetResponse.status).toBe(200);
    expect(resetResponse.body.message).toBe("Password reset successful");

    const loginResponse = await request(app)
      .post("/auth/login/start")
      .send({
        email: uniqueEmail,
        password: "newpass123"
      });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.message).toBe("OTP generated successfully");
    expect(loginResponse.body.devOtp).toBeDefined();
  });

  it("rejects invalid reset code", async () => {
    await registerTestUser(uniqueEmail);

    await request(app)
      .post("/auth/forgot-password")
      .send({
        email: uniqueEmail
      });

    const response = await request(app)
      .post("/auth/reset-password")
      .send({
        email: uniqueEmail,
        resetCode: "000000",
        newPassword: "newpass123"
      });

    expect(response.status).toBe(401);
    expect(response.body.error).toBe("Invalid reset code");
  });
});