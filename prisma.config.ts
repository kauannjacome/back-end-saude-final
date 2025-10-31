// prisma.config.ts
import "dotenv/config"; // <-- importante: carrega as variáveis do .env

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: process.env.DATABASE_URL, // usa a variável carregada do .env
  },
};
