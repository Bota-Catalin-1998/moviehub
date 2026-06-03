import request from "supertest";
import bcrypt from "bcrypt";
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import app from "./app.js";
import prisma from "./lib/prisma.js";

const ADMIN_EMAIL = "admin@moviehub.com";
const USER_EMAIL = "user@moviehub.com";

let adminToken = "";
let userToken = "";

const seedRolesPermissionsUsers = async () => {
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();

  const adminRole = await prisma.role.create({
    data: { name: "ADMIN" }
  });

  const userRole = await prisma.role.create({
    data: { name: "USER" }
  });

  await prisma.permission.createMany({
    data: [
      { name: "READ_MOVIES" },
      { name: "CREATE_MOVIES" },
      { name: "UPDATE_MOVIES" },
      { name: "DELETE_MOVIES" }
    ]
  });

  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.create({
      data: {
        roleId: adminRole.id,
        permissionId: permission.id
      }
    });
  }

  const readPermission = await prisma.permission.findUnique({
    where: { name: "READ_MOVIES" }
  });

  await prisma.rolePermission.create({
    data: {
      roleId: userRole.id,
      permissionId: readPermission.id
    }
  });

  const adminPassword = await bcrypt.hash("admin123", 10);
  const userPassword = await bcrypt.hash("user123", 10);

  await prisma.user.create({
    data: {
      name: "Admin User",
      email: ADMIN_EMAIL,
      password: adminPassword,
      roleId: adminRole.id
    }
  });

  await prisma.user.create({
    data: {
      name: "Normal User",
      email: USER_EMAIL,
      password: userPassword,
      roleId: userRole.id
    }
  });
};

const seedMovies = async () => {
  await prisma.movie.createMany({
    data: [
      {
        title: "Inception",
        genre: "Sci-Fi",
        releaseYear: 2010,
        rating: 8.8,
        status: "Watched",
        description: "A mind-bending thriller",
        imageUrl: ""
      },
      {
        title: "Interstellar",
        genre: "Sci-Fi",
        releaseYear: 2014,
        rating: 8.6,
        status: "Watchlist",
        description: "Space exploration and time",
        imageUrl: ""
      }
    ]
  });
};

async function loginAndGetToken(email, password) {
  const response = await request(app)
    .post("/auth/login")
    .send({ email, password });

  return response.body.token;
}

describe("Movies API", () => {
  beforeEach(async () => {
    await prisma.actionLog.deleteMany();
    await prisma.observationUser.deleteMany();
    await prisma.movie.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.user.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();

    await seedRolesPermissionsUsers();
    await seedMovies();

    adminToken = await loginAndGetToken(ADMIN_EMAIL, "admin123");
    userToken = await loginAndGetToken(USER_EMAIL, "user123");
  });

  afterAll(async () => {
    await prisma.actionLog.deleteMany();
    await prisma.observationUser.deleteMany();
    await prisma.movie.deleteMany();
    await prisma.rolePermission.deleteMany();
    await prisma.user.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();
    await prisma.$disconnect();
  });

  it("should return all movies", async () => {
    const response = await request(app)
      .get("/movies")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("data");
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.total).toBe(2);
  });

  it("should return one movie by id", async () => {
    const movie = await prisma.movie.findFirst({
      where: { title: "Inception" }
    });

    const response = await request(app)
      .get(`/movies/${movie.id}`)
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("id", movie.id);
    expect(response.body).toHaveProperty("title", "Inception");
  });

  it("should create a new movie", async () => {
    const newMovie = {
      title: "Gladiator",
      genre: "Action",
      releaseYear: 2000,
      rating: 8.5,
      status: "Watched",
      description: "A Roman general seeks revenge",
      imageUrl: ""
    };

    const response = await request(app)
      .post("/movies")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(newMovie);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("title", "Gladiator");

    const createdMovie = await prisma.movie.findFirst({
      where: { title: "Gladiator" }
    });

    expect(createdMovie).not.toBeNull();
  });

  it("should reject invalid movie creation", async () => {
    const invalidMovie = {
      title: "",
      genre: "A",
      releaseYear: 3000,
      rating: 15,
      status: "Watched",
      description: "abc"
    };

    const response = await request(app)
      .post("/movies")
      .set("Authorization", `Bearer ${adminToken}`)
      .send(invalidMovie);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "Validation failed");
  });

  it("should update an existing movie", async () => {
    const movie = await prisma.movie.findFirst({
      where: { title: "Inception" }
    });

    const response = await request(app)
      .put(`/movies/${movie.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Inception",
        genre: "Sci-Fi",
        releaseYear: 2010,
        rating: 9.1,
        status: "Watched",
        description: "A mind-bending thriller",
        imageUrl: ""
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("rating", 9.1);

    const updatedMovie = await prisma.movie.findUnique({
      where: { id: movie.id }
    });

    expect(updatedMovie.rating).toBe(9.1);
  });

  it("should delete a movie", async () => {
    const createResponse = await request(app)
      .post("/movies")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        title: "Temporary Movie",
        genre: "Drama",
        releaseYear: 2020,
        rating: 7.5,
        status: "Watchlist",
        description: "Temporary description",
        imageUrl: ""
      });

    const movieId = createResponse.body.id;

    const deleteResponse = await request(app)
      .delete(`/movies/${movieId}`)
      .set("Authorization", `Bearer ${adminToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toHaveProperty("id", movieId);

    const deletedMovie = await prisma.movie.findUnique({
      where: { id: movieId }
    });

    expect(deletedMovie).toBeNull();
  });

  it("should filter movies by genre", async () => {
    const response = await request(app)
      .get("/movies?genre=Sci-Fi")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((movie) => movie.genre === "Sci-Fi")).toBe(true);
  });

  it("should filter movies by status", async () => {
    const response = await request(app)
      .get("/movies?status=Watched")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data.every((movie) => movie.status === "Watched")).toBe(true);
  });

  it("should filter movies by title", async () => {
    const response = await request(app)
      .get("/movies?title=inter")
      .set("Authorization", `Bearer ${userToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(
      response.body.data.every((movie) =>
        movie.title.toLowerCase().includes("inter")
      )
    ).toBe(true);
  });
});