// src/routes/requestRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireStaff } from "../middleware/roleMiddleware";
import {
  getRecentRequests,
  createRequest,
  updateRequest,
  listRequests,
  exportRequestsXlsx,
  getStatusCounts,
  getRequestImages,
  downloadRequestImage,
  uploadRequestImages,
  deleteRequestImage,
  getRequestDetail,
  changeRequestStatus,
  updateRequestOrderNumber,
  saveAssignment,
  deleteAssignment,
  getRequestTracking,
} from "../controllers/requestController";
import {
  insungRegister,
  insungLocation,
  call24Register,
  call24Location,
  getIntegrationStatus,
} from "../controllers/integrationController";

const router = Router();

router.get("/recent", authMiddleware, getRecentRequests);
router.post("/", authMiddleware, createRequest);
router.patch("/:id", authMiddleware, updateRequest);
router.get("/", authMiddleware, listRequests);
router.get("/export.xlsx", authMiddleware, exportRequestsXlsx);
router.get("/status-counts", authMiddleware, getStatusCounts);
router.get("/:id/images", authMiddleware, getRequestImages);
router.get("/:id/images/:imageId/file", authMiddleware, downloadRequestImage);
router.post("/:id/images", authMiddleware, uploadRequestImages);
router.delete("/:id/images/:imageId", authMiddleware, deleteRequestImage);
router.get("/:id/tracking", authMiddleware, getRequestTracking);
router.get("/:id", authMiddleware, getRequestDetail);
router.patch("/:id/status", authMiddleware, changeRequestStatus);
router.patch("/:id/order-number", authMiddleware, updateRequestOrderNumber);
router.post("/:id/assignment", authMiddleware, saveAssignment);
router.delete("/:id/assignment", authMiddleware, deleteAssignment);

// ── 외부 연동 (STAFF 전용) ────────────────────────────────
router.get("/:id/integrations/status", authMiddleware, requireStaff, getIntegrationStatus);
router.post("/:id/integrations/insung/register", authMiddleware, requireStaff, insungRegister);
router.get("/:id/integrations/insung/location", authMiddleware, requireStaff, insungLocation);
router.post("/:id/integrations/call24/register", authMiddleware, requireStaff, call24Register);
router.get("/:id/integrations/call24/location", authMiddleware, requireStaff, call24Location);

export default router;
