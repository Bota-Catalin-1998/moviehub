import express from "express";
import {
  getLogs,
  getObservationList
} from "../controllers/admin.controller.js";
import { requirePermission } from "../middleware/permission.middleware.js";

const router = express.Router();

router.get("/logs", requirePermission("DELETE_MOVIES"), getLogs);
router.get("/observation-list", requirePermission("DELETE_MOVIES"), getObservationList);

export default router;