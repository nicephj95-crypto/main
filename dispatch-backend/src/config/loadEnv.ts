import { config } from "dotenv";

// Prefer local overrides, then fall back to the shared .env file.
config({ path: [".env.local", ".env"] });
