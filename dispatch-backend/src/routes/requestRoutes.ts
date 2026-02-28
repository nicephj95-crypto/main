// src/routes/requestRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import {
  getRecentRequests,
  createRequest,
  listRequests,
  exportRequestsXlsx,
  getStatusCounts,
  getRequestImages,
  uploadRequestImages,
  deleteRequestImage,
  getRequestDetail,
  changeRequestStatus,
  saveAssignment,
  deleteAssignment,
} from "../controllers/requestController";

const router = Router();

router.get("/recent", authMiddleware, getRecentRequests);
router.post("/", authMiddleware, createRequest);
router.get("/", authMiddleware, listRequests);
router.get("/export.xlsx", authMiddleware, exportRequestsXlsx);
router.get("/status-counts", authMiddleware, getStatusCounts);
router.get("/:id/images", authMiddleware, getRequestImages);
router.post("/:id/images", authMiddleware, uploadRequestImages);
router.delete("/:id/images/:imageId", authMiddleware, deleteRequestImage);
router.get("/:id", authMiddleware, getRequestDetail);
router.patch("/:id/status", authMiddleware, changeRequestStatus);
router.post("/:id/assignment", authMiddleware, saveAssignment);
router.delete("/:id/assignment", authMiddleware, deleteAssignment);

export default router;
