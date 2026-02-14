import { Router } from "express";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    module: "reactivation",
    timestamp: new Date().toISOString(),
  });
});

export default router;