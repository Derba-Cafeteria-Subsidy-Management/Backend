// src/server.ts
// import express from 'express';
import { config } from './config.js';
import { app } from './app.js';


async function main() {
  // start server
  const port = config.port;
  app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
  });
}

main().catch((e) => {
  console.error("Failed to start server", e);
  process.exit(1);
});
