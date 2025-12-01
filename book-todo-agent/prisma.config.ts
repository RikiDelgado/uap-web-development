// prisma.config.ts
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

export default {
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
      provider: "postgresql",
    },
  },
};
