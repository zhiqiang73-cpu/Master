import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { initStandScheduler } from "../standEngine";
import { getDb } from "../db";
import { agentRoles } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  // 初始化替身 Cron 调度器（延迟 3 秒等待数据库就绪）
  setTimeout(async () => {
    try {
      await initStandScheduler(async (roleId) => {
        const db = await getDb();
        if (!db) return;
        const [role] = await db.select().from(agentRoles).where(eq(agentRoles.id, roleId));
        if (!role) return;
        // 使用导出的调度器专用函数
        const { runForumAgentFromScheduler } = await import("../routers");
        await runForumAgentFromScheduler(role as any);
      });
    } catch (err) {
      console.error("[Server] Failed to init stand scheduler:", err);
    }
  }, 3000);

  // 初始化 RSS 情报推送调度器（每天早上 8:00 运行）
  setTimeout(async () => {
    const scheduleNextRun = () => {
      const now = new Date();
      const next8am = new Date(now);
      next8am.setHours(8, 0, 0, 0);
      if (next8am <= now) next8am.setDate(next8am.getDate() + 1);
      const msUntil = next8am.getTime() - now.getTime();
      console.log(`[RSS] Daily digest scheduled for ${next8am.toLocaleString("zh-CN")} (in ${Math.round(msUntil / 60000)} min)`);
      setTimeout(async () => {
        try {
          const { runAllRssDigests } = await import("../routers");
          await runAllRssDigests();
        } catch (err) {
          console.error("[RSS] Daily digest failed:", err);
        }
        scheduleNextRun(); // reschedule for next day
      }, msUntil);
    };
    scheduleNextRun();
  }, 5000);
}

startServer().catch(console.error);
