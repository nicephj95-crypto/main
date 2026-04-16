const { spawn } = require("child_process");
const { config } = require("dotenv");

config({ path: [".env.local", ".env"] });

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: node scripts/prisma-local.js <prisma-args...>");
  process.exit(1);
}

const child = spawn("npx", ["prisma", ...args], {
  stdio: "inherit",
  env: process.env,
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
