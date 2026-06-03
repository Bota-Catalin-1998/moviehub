import { PrismaClient } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

const MOVIE_COUNT = 2000;
const ACTOR_COUNT = 1000;
const RELATION_COUNT = 10000;

const genres = [
  "Action",
  "Drama",
  "Comedy",
  "Sci-Fi",
  "Romance",
  "Horror",
  "Thriller",
  "Adventure",
  "Fantasy",
  "Crime"
];

const statuses = ["Watched", "Watchlist"];

async function ensureRolesAndUsersStillExist() {
  let adminRole = await prisma.role.findUnique({
    where: { name: "ADMIN" }
  });

  if (!adminRole) {
    adminRole = await prisma.role.create({
      data: { name: "ADMIN" }
    });
  }

  let userRole = await prisma.role.findUnique({
    where: { name: "USER" }
  });

  if (!userRole) {
    userRole = await prisma.role.create({
      data: { name: "USER" }
    });
  }

  const permissionNames = [
    "READ_MOVIES",
    "CREATE_MOVIES",
    "UPDATE_MOVIES",
    "DELETE_MOVIES"
  ];

  for (const permissionName of permissionNames) {
    const permission = await prisma.permission.upsert({
      where: { name: permissionName },
      update: {},
      create: { name: permissionName }
    });

    const adminPermissionExists = await prisma.rolePermission.findFirst({
      where: {
        roleId: adminRole.id,
        permissionId: permission.id
      }
    });

    if (!adminPermissionExists) {
      await prisma.rolePermission.create({
        data: {
          roleId: adminRole.id,
          permissionId: permission.id
        }
      });
    }

    if (permissionName === "READ_MOVIES") {
      const userPermissionExists = await prisma.rolePermission.findFirst({
        where: {
          roleId: userRole.id,
          permissionId: permission.id
        }
      });

      if (!userPermissionExists) {
        await prisma.rolePermission.create({
          data: {
            roleId: userRole.id,
            permissionId: permission.id
          }
        });
      }
    }
  }
}

async function main() {
  console.log("Ensuring roles and permissions exist...");
  await ensureRolesAndUsersStillExist();

  console.log("Deleting old Gold performance data only...");

  await prisma.movieActor.deleteMany();
  await prisma.actor.deleteMany();
  await prisma.movie.deleteMany();

  console.log("Creating movies...");

  const moviesData = Array.from({ length: MOVIE_COUNT }, () => ({
    title: faker.lorem.words({ min: 2, max: 5 }),
    genre: faker.helpers.arrayElement(genres),
    releaseYear: faker.number.int({ min: 1970, max: 2026 }),
    rating: Number(faker.number.float({ min: 1, max: 10, fractionDigits: 1 })),
    status: faker.helpers.arrayElement(statuses),
    description: faker.lorem.sentence(),
    imageUrl: ""
  }));

  await prisma.movie.createMany({
    data: moviesData
  });

  console.log("Creating actors...");

  const actorsData = Array.from({ length: ACTOR_COUNT }, () => ({
    name: faker.person.fullName(),
    country: faker.location.country(),
    birthYear: faker.number.int({ min: 1940, max: 2005 })
  }));

  await prisma.actor.createMany({
    data: actorsData
  });

  const movies = await prisma.movie.findMany({
    select: { id: true }
  });

  const actors = await prisma.actor.findMany({
    select: { id: true }
  });

  console.log("Creating movie-actor many-to-many relations...");

  const usedPairs = new Set();
  const relations = [];

  while (relations.length < RELATION_COUNT) {
    const movie = faker.helpers.arrayElement(movies);
    const actor = faker.helpers.arrayElement(actors);
    const key = `${movie.id}-${actor.id}`;

    if (!usedPairs.has(key)) {
      usedPairs.add(key);

      relations.push({
        movieId: movie.id,
        actorId: actor.id
      });
    }
  }

  await prisma.movieActor.createMany({
    data: relations
  });

  console.log("Gold seed completed successfully.");
  console.log(`Movies: ${MOVIE_COUNT}`);
  console.log(`Actors: ${ACTOR_COUNT}`);
  console.log(`MovieActor relations: ${RELATION_COUNT}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });