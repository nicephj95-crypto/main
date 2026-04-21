// src/hooks/useAddressBook.ts
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  listAddressBook,
  createAddressBookEntry,
  updateAddressBookEntry,
  deleteAddressBookEntry,
  listAddressBookImages,
  uploadAddressBookImages,
  deleteAddressBookImage,
  importAddressBookExcel,
} from "../api/client";
import type {
  AddressBookEntry,
  AddressBookImageAsset,
  AddressBookImportResult,
  CreateAddressBookBody,
} from "../api/types";
import type { AuthUser } from "../LoginPanel";

export type FormState = {
  businessName: string;
  placeName: string;
  address: string;
  addressDetail: string;
  contactName: string;
  contactPhone: string;
  lunchStartHour: string;
  lunchStartMinute: string;
  lunchEndHour: string;
  lunchEndMinute: string;
  memo: string;
  type: "PICKUP" | "DROPOFF" | "BOTH";
};

export const HOUR_OPTIONS = ["10", "11", "12", "13", "14", "15"];
export const MINUTE_OPTIONS = Array.from({ length: 6 }, (_, i) =>
  String(i * 10).padStart(2, "0")
);

const splitClock = (value?: string | null) => {
  const raw = (value ?? "").trim();
  if (!/^\d{2}:\d{2}$/.test(raw)) return { hour: "", minute: "" };
  const [hour, minute] = raw.split(":");
  return { hour, minute };
};

const parseLunchTime = (value?: string | null) => {
  const normalized = (value ?? "").trim().replace(/\s+/g, "");
  const [start = "", end = ""] = normalized.split("~");
  const startClock = splitClock(start);
  const endClock = splitClock(end);
  return {
    lunchStartHour: startClock.hour,
    lunchStartMinute: startClock.minute,
    lunchEndHour: endClock.hour,
    lunchEndMinute: endClock.minute,
  };
};

const composeClock = (hour: string, minute: string) => {
  if (!hour && !minute) return "";
  if (!hour || !minute) return "";
  return `${hour}:${minute}`;
};

const composeLunchTime = (
  startHour: string,
  startMinute: string,
  endHour: string,
  endMinute: string
) => {
  const start = composeClock(startHour, startMinute);
  const end = composeClock(endHour, endMinute);
  if (!start && !end) return undefined;
  if (start && end) return `${start}~${end}`;
  return start || end;
};

const EMPTY_FORM: FormState = {
  businessName: "",
  placeName: "",
  address: "",
  addressDetail: "",
  contactName: "",
  contactPhone: "",
  lunchStartHour: "",
  lunchStartMinute: "",
  lunchEndHour: "",
  lunchEndMinute: "",
  memo: "",
  type: "BOTH",
};

export function useAddressBook(currentUser: AuthUser) {
  const isAdmin = currentUser.role === "ADMIN";
  const isStaff =
    currentUser.role === "ADMIN" ||
    currentUser.role === "DISPATCHER" ||
    currentUser.role === "SALES";
  const isClient = currentUser.role === "CLIENT";
  const canFilterByCompany = isStaff;
  const canManageImages = !!currentUser;

  const [entries, setEntries] = useState<AddressBookEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageJumpInput, setPageJumpInput] = useState("1");
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const hasInitialized = useRef(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [addressSearchTarget, setAddressSearchTarget] = useState<"create" | "edit" | null>(null);
  const [groupKeyword, setGroupKeyword] = useState<string>("");

  const [editing, setEditing] = useState<AddressBookEntry | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageTarget, setImageTarget] = useState<AddressBookEntry | null>(null);
  const [imageItems, setImageItems] = useState<AddressBookImageAsset[]>([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageDeletingId, setImageDeletingId] = useState<number | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [imagePreviewId, setImagePreviewId] = useState<number | null>(null);

  const [excelImporting, setExcelImporting] = useState(false);
  const [excelImportResult, setExcelImportResult] = useState<AddressBookImportResult | null>(null);
  const [excelMenuOpen, setExcelMenuOpen] = useState(false);

  const excelFileInputRef = useRef<HTMLInputElement | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPageJumpInput(String(page));
  }, [page]);

  const getPaginationNumbers = (): (number | "...")[] => {
    const PAGE_WINDOW_SIZE = 8;
    if (totalPages <= PAGE_WINDOW_SIZE + 1) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const visibleCore = Math.max(1, PAGE_WINDOW_SIZE - 1);
    const coreEnd = Math.min(totalPages - 1, Math.max(visibleCore, page + (visibleCore - 3)));
    const coreStart = Math.max(1, coreEnd - visibleCore + 1);
    const nums: (number | "...")[] = [];
    for (let p = coreStart; p <= coreEnd; p++) nums.push(p);
    if (coreEnd < totalPages - 1) nums.push("...");
    nums.push(totalPages);
    return nums;
  };

  const pagedEntries = entries;

  // 🔹 주소록 목록 불러오기
  const fetchAddressBook = async (
    searchText?: string,
    companyName?: string,
    targetPage: number = 1,
    targetSize: number = pageSize
  ) => {
    setLoading(true);
    setError(null);
    try {
      const q =
        searchText && searchText.trim() !== ""
          ? searchText.trim()
          : undefined;

      const company =
        canFilterByCompany && companyName && companyName.trim() !== ""
          ? companyName.trim()
          : undefined;

      const data = await listAddressBook(q, company, targetPage, targetSize);
      setEntries(data.items);
      setTotal(data.total);
      setPage(data.page);
      if (!hasInitialized.current) {
        hasInitialized.current = true;
        setInitialized(true);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "주소록 조회 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAddressBook(undefined, undefined, 1, pageSize);
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      void fetchAddressBook(search, groupKeyword, page, pageSize);
    };

    window.addEventListener("addressbook:refresh", handleRefresh);
    return () => {
      window.removeEventListener("addressbook:refresh", handleRefresh);
    };
  }, [search, groupKeyword, page, pageSize]);

  const handleSearchFormAddress = () => {
    setAddressSearchTarget("create");
  };

  const handleSearchEditAddress = () => {
    setAddressSearchTarget("edit");
  };

  const handleAddressSearchSelect = (address: string) => {
    if (addressSearchTarget === "create") {
      setForm((prev) => ({ ...prev, address, addressDetail: "" }));
    } else if (addressSearchTarget === "edit") {
      setEditForm((prev) => prev ? { ...prev, address, addressDetail: "" } : prev);
    }
  };

  // 🔹 인풋 공통 핸들러 (새 주소 폼)
  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 🔹 인풋 공통 핸들러 (수정 모달 폼)
  const handleEditChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (!editForm) return;
    const { name, value } = e.target;
    setEditForm((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  // 🔹 새 주소 저장
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isClient && !form.businessName.trim()) {
      setError("업체명을 선택해주세요.");
      return;
    }

    if (!form.placeName || !form.address) {
      setError("상호명과 주소는 필수입니다.");
      return;
    }

      const body: CreateAddressBookBody = {
      businessName: isClient ? currentUser.companyName?.trim() || undefined : form.businessName || undefined,
      placeName: form.placeName,
      address: form.address,
      addressDetail: form.addressDetail || undefined,
      contactName: form.contactName || undefined,
      contactPhone: form.contactPhone || undefined,
      lunchTime: composeLunchTime(
        form.lunchStartHour,
        form.lunchStartMinute,
        form.lunchEndHour,
        form.lunchEndMinute
      ),
      memo: form.memo || undefined,
      type: form.type,
    };

    setCreating(true);
    try {
      await createAddressBookEntry(body);
      await fetchAddressBook(search, groupKeyword);
      setForm(EMPTY_FORM);
      setCreateModalOpen(false);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "주소록 저장 중 오류가 발생했습니다.");
    } finally {
      setCreating(false);
    }
  };

  // 🔹 [수정] 버튼 클릭 → 모달 열기
  const handleEditClick = (item: AddressBookEntry) => {
    const lunch = parseLunchTime(item.lunchTime);
    setEditing(item);
    setEditForm({
      businessName: item.businessName ?? "",
      placeName: item.placeName,
      address: item.address,
      addressDetail: item.addressDetail ?? "",
      contactName: item.contactName ?? "",
      contactPhone: item.contactPhone ?? "",
      lunchStartHour: lunch.lunchStartHour,
      lunchStartMinute: lunch.lunchStartMinute,
      lunchEndHour: lunch.lunchEndHour,
      lunchEndMinute: lunch.lunchEndMinute,
      memo: item.memo ?? "",
      type: item.type,
    });
  };

  // 🔹 수정 모달에서 저장
  const handleSaveEdit = async () => {
    if (!editing || !editForm) return;

    if (!isClient && !editForm.businessName.trim()) {
      alert("업체명을 선택해주세요.");
      return;
    }

    const body: Partial<CreateAddressBookBody> = {
      businessName: isClient ? currentUser.companyName?.trim() || undefined : editForm.businessName || undefined,
      placeName: editForm.placeName,
      address: editForm.address,
      addressDetail: editForm.addressDetail || undefined,
      contactName: editForm.contactName || undefined,
      contactPhone: editForm.contactPhone || undefined,
      lunchTime: composeLunchTime(
        editForm.lunchStartHour,
        editForm.lunchStartMinute,
        editForm.lunchEndHour,
        editForm.lunchEndMinute
      ),
      memo: editForm.memo || undefined,
      type: editForm.type,
    };

    try {
      await updateAddressBookEntry(editing.id, body);
      await fetchAddressBook(search, groupKeyword);
      setEditing(null);
      setEditForm(null);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "주소록 수정 중 오류가 발생했습니다.");
    }
  };

  // 🔹 삭제
  const handleDelete = async (item: AddressBookEntry) => {
    const ok = window.confirm(
      `"${item.placeName}" 주소록 항목을 삭제하시겠습니까?`
    );
    if (!ok) return;

    try {
      await deleteAddressBookEntry(item.id);
      await fetchAddressBook(search, groupKeyword);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "주소록 삭제 중 오류가 발생했습니다.");
    }
  };

  const handleImportExcelFile = async (file: File) => {
    setError(null);
    setExcelImporting(true);
    try {
      const result = await importAddressBookExcel(file);
      setExcelImportResult(result);
      await fetchAddressBook(search, groupKeyword);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "주소록 엑셀 업로드 중 오류가 발생했습니다.");
    } finally {
      setExcelImporting(false);
    }
  };

  const formatPhoneDisplay = (phone?: string | null) => {
    if (!phone) return "-";
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
    }
    if (digits.length === 10) {
      return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  const handleOpenImageModal = async (item: AddressBookEntry) => {
    setImageTarget(item);
    setImageModalOpen(true);
    setImageLoading(true);
    setImageError(null);
    try {
      const list = await listAddressBookImages(item.id);
      setImageItems(list);
      setImagePreviewId(list[0]?.id ?? null);
    } catch (err: any) {
      console.error(err);
      setImageError(err?.message || "이미지 조회 중 오류가 발생했습니다.");
      setImageItems([]);
    } finally {
      setImageLoading(false);
    }
  };

  const handleCloseImageModal = () => {
    if (imageUploading) return;
    setImageModalOpen(false);
    setImageTarget(null);
    setImageItems([]);
    setImageError(null);
    setImagePreviewId(null);
  };

  const syncEntryImageCount = (entryId: number, count: number) => {
    setEntries((prev) =>
      prev.map((e) =>
        e.id === entryId ? { ...e, imageCount: count, hasImages: count > 0 } : e
      )
    );
    setImageTarget((prev) =>
      prev && prev.id === entryId
        ? { ...prev, imageCount: count, hasImages: count > 0 }
        : prev
    );
  };

  const handleUploadAddressImages = async (files: FileList | null) => {
    if (!canManageImages) {
      setImageError("이 주소록에 이미지를 업로드할 권한이 없습니다.");
      return;
    }
    if (!imageTarget || !files) return;
    const remain = 5 - imageItems.length;
    if (remain <= 0) {
      alert("이미지는 최대 5장까지 등록할 수 있습니다.");
      return;
    }
    const picked = Array.from(files).slice(0, remain);
    if (picked.length < files.length) {
      alert("이미지는 최대 5장까지 등록할 수 있습니다.");
    }
    try {
      setImageUploading(true);
      setImageError(null);
      const created = await uploadAddressBookImages(imageTarget.id, picked);
      setImageItems((prev) => {
        const next = [...prev, ...created].sort((a, b) => a.sortOrder - b.sortOrder);
        syncEntryImageCount(imageTarget.id, next.length);
        if (!imagePreviewId && next[0]) {
          setImagePreviewId(next[0].id);
        }
        return next;
      });
      await fetchAddressBook(search, groupKeyword);
    } catch (err: any) {
      console.error(err);
      setImageError(err?.message || "이미지 업로드 중 오류가 발생했습니다.");
    } finally {
      setImageUploading(false);
    }
  };

  const handleDeleteAddressImage = async (imageId: number) => {
    if (!canManageImages) {
      alert("이 주소록 이미지를 삭제할 권한이 없습니다.");
      return;
    }
    if (!imageTarget) return;
    if (!window.confirm("이미지를 삭제하시겠습니까?")) return;
    try {
      setImageDeletingId(imageId);
      await deleteAddressBookImage(imageTarget.id, imageId);
      setImageItems((prev) => {
        const next = prev.filter((img) => img.id !== imageId);
        syncEntryImageCount(imageTarget.id, next.length);
        if (imagePreviewId === imageId) {
          setImagePreviewId(next[0]?.id ?? null);
        }
        return next;
      });
      await fetchAddressBook(search, groupKeyword);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "이미지 삭제 중 오류가 발생했습니다.");
    } finally {
      setImageDeletingId(null);
    }
  };

  const previewImage =
    imageItems.find((img) => img.id === imagePreviewId) ?? imageItems[0] ?? null;

  return {
    // Initialization
    initialized,
    // Role
    isAdmin,
    isStaff,
    isClient,
    canFilterByCompany,
    canManageImages,
    // List
    entries,
    pagedEntries,
    loading,
    error,
    setError,
    // Search
    search,
    setSearch,
    groupKeyword,
    setGroupKeyword,
    fetchAddressBook,
    // Pagination
    page,
    setPage,
    pageSize,
    setPageSize,
    total,
    pageJumpInput,
    setPageJumpInput,
    totalPages,
    getPaginationNumbers,
    // Create modal
    createModalOpen,
    setCreateModalOpen,
    creating,
    form,
    setForm,
    handleChange,
    handleSubmit,
    handleSearchFormAddress,
    addressSearchTarget,
    setAddressSearchTarget,
    handleAddressSearchSelect,
    // Edit modal
    editing,
    setEditing,
    editForm,
    setEditForm,
    handleEditChange,
    handleEditClick,
    handleSaveEdit,
    handleSearchEditAddress,
    // Delete
    handleDelete,
    // Excel
    excelImporting,
    excelImportResult,
    setExcelImportResult,
    excelMenuOpen,
    setExcelMenuOpen,
    excelFileInputRef,
    handleImportExcelFile,
    // Image modal
    imageModalOpen,
    imageTarget,
    imageItems,
    imageLoading,
    imageUploading,
    imageDeletingId,
    imageError,
    imagePreviewId,
    setImagePreviewId,
    previewImage,
    handleOpenImageModal,
    handleCloseImageModal,
    handleUploadAddressImages,
    handleDeleteAddressImage,
    // Formatters
    formatPhoneDisplay,
  };
}
