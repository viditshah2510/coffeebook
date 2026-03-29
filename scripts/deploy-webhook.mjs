#!/usr/bin/env node
// Tiny webhook server - listens for GitHub push events and deploys
// Run: node scripts/deploy-webhook.mjs
// Or: pm2 start scripts/deploy-webhook.mjs --name coffeebook-deploy

import http from "node:http";
import crypto from "node:crypto";
import { exec } from "node:child_process";
import { resolve } from "node:path";

const PORT = 9876;
const SECRET = process.env.DEPLOY_WEBHOOK_SECRET || "";
const PROJECT_DIR = resolve(import.meta.dirname, "..");

let deploying = false;

function verify(payload, signature) {
  if (!SECRET) return true; // no secret = accept all (dev mode)
  const expected = `sha256=${crypto.createHmac("sha256", SECRET).update(payload).digest("hex")}`;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function deploy() {
  if (deploying) { console.log("Deploy already in progress, skipping"); return; }
  deploying = true;
  console.log(`[${new Date().toISOString()}] Deploying...`);

  exec(
    "git pull origin main && docker compose down && docker compose up -d --build",
    { cwd: PROJECT_DIR, timeout: 600000 },
    (err, stdout, stderr) => {
      deploying = false;
      if (err) {
        console.error("Deploy FAILED:", stderr);
      } else {
        console.log("Deploy SUCCESS:", stdout);
      }
    }
  );
}

const server = http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/deploy") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const sig = req.headers["x-hub-signature-256"] || "";
      if (SECRET && !verify(body, sig)) {
        res.writeHead(401).end("Invalid signature");
        return;
      }
      try {
        const data = JSON.parse(body);
        if (data.ref === "refs/heads/main") {
          deploy();
          res.writeHead(200).end("Deploy triggered");
        } else {
          res.writeHead(200).end("Not main branch");
        }
      } catch {
        res.writeHead(400).end("Bad request");
      }
    });
  } else if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200).end("OK");
  } else {
    res.writeHead(404).end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Deploy webhook listening on :${PORT}`);
});
