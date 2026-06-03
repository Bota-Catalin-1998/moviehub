import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  await prisma.actionLog.deleteMany();
  await prisma.observationUser.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.permission.deleteMany();
  await prisma.role.deleteMany();
  await prisma.movie.deleteMany();

  const adminRole = await prisma.role.create({
    data: {
      name: "ADMIN"
    }
  });

  const userRole = await prisma.role.create({
    data: {
      name: "USER"
    }
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
      email: "admin@moviehub.com",
      password: adminPassword,
      roleId: adminRole.id
    }
  });

  await prisma.user.create({
    data: {
      name: "Normal User",
      email: "user@moviehub.com",
      password: userPassword,
      roleId: userRole.id
    }
  });

  await prisma.movie.createMany({
    data: [
      {
        title: "Interstellar",
        genre: "Sci-Fi",
        releaseYear: 2014,
        rating: 8.6,
        status: "Watchlist",
        description: "Space exploration and time",
        imageUrl: ""
      },
      {
        title: "Gladiator",
        genre: "Action",
        releaseYear: 2000,
        rating: 8.5,
        status: "Watched",
        description: "A Roman general seeks revenge",
        imageUrl: ""
      },
      {
        title: "The Notebook",
        genre: "Romance",
        releaseYear: 2004,
        rating: 7.8,
        status: "Watchlist",
        description: "A love story across many years",
        imageUrl: ""
      },
      {
        title: "The Dark Knight",
        genre: "Action",
        releaseYear: 2008,
        rating: 9.0,
        status: "Watched",
        description: "Batman faces the Joker",
        imageUrl: ""
      }
    ]
  });

  console.log("Seed completed successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });