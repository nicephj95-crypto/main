// src/routes/addressBookRoutes.ts
import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import {
  downloadTemplate,
  importAddressBook,
  listAddressBook,
  getAddressBookImages,
  downloadAddressBookImage,
  uploadAddressBookImages,
  deleteAddressBookImage,
  createAddressBookEntry,
  updateAddressBookEntry,
  deleteAddressBookEntry,
  listCompanies,
  createCompany,
  deleteCompany,
} from "../controllers/addressBookController";

const router = Router();

// 모든 주소록 API는 로그인 필수
router.use(authMiddleware);

// ── 정적 경로 (/:id 보다 먼저 선언) ──────────────────────
router.get("/template.xlsx", downloadTemplate);
router.post("/import", importAddressBook);

// 회사명 관리 (GET: 전체 사용자, POST/DELETE: 직원 이상)
router.get("/companies", listCompanies);
router.post("/companies", requireRole("ADMIN", "DISPATCHER"), createCompany);
router.delete("/companies/:companyId", requireRole("ADMIN", "DISPATCHER"), deleteCompany);

// 주소록 CRUD
router.get("/", listAddressBook);
router.post("/", createAddressBookEntry);
router.patch("/:id", updateAddressBookEntry);
router.delete("/:id", deleteAddressBookEntry);

// 주소록 이미지
router.get("/:id/images", getAddressBookImages);
router.get("/:id/images/:imageId/file", downloadAddressBookImage);
router.post("/:id/images", uploadAddressBookImages);
router.delete("/:id/images/:imageId", deleteAddressBookImage);

export default router;
