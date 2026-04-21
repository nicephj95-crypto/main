// src/AddressBookPage.tsx
import { useState, useEffect, useRef } from "react";
import { downloadAddressBookImportTemplate } from "./api/client";
import { listGroups } from "./api/groups";
import type { GroupManagementGroup } from "./api/types";
import type { AuthUser } from "./LoginPanel";
import { ExcelIcon } from "./ui/icons";
import { useAddressBook } from "./hooks/useAddressBook";
import { ExcelImportResultModal } from "./components/ExcelImportResultModal";
import { AddressBookCreateModal } from "./components/AddressBookCreateModal";
import { AddressBookEditModal } from "./components/AddressBookEditModal";
import { AddressBookImageModal } from "./components/AddressBookImageModal";
import { HistoryModal } from "./components/HistoryModal";
import { AddressSearchModal } from "./AddressSearchModal";
import { Plus, Pencil, Trash2, Image as ImageIcon } from "lucide-react";

type AddressBookPageProps = {
  currentUser: AuthUser;
};

export function AddressBookPage({ currentUser }: AddressBookPageProps) {
  const [historyEntryId, setHistoryEntryId] = useState<number | null>(null);
  const [historyEntryName, setHistoryEntryName] = useState("");
  const [groups, setGroups] = useState<GroupManagementGroup[]>([]);

  const [autoRegister, setAutoRegister] = useState(() => {
    const saved = localStorage.getItem("addressAutoRegister");
    return saved !== null ? saved === "true" : true;
  });

  const toggleAutoRegister = () => {
    const newValue = !autoRegister;
    setAutoRegister(newValue);
    localStorage.setItem("addressAutoRegister", String(newValue));
  };

  const {
    initialized,
    isAdmin,
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
    totalPages,
    getPaginationNumbers,
    // Create modal
    createModalOpen,
    setCreateModalOpen,
    creating,
    form,
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
  } = useAddressBook(currentUser);

  // 검색어 변경 시 600ms debounce 자동검색 (초기 마운트에서는 실행하지 않음 — 훅 내부 useEffect가 초기 로드 담당)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    const timer = setTimeout(() => {
      void fetchAddressBook(search, canFilterByCompany ? groupKeyword : undefined, 1, pageSize);
    }, 600);
    return () => clearTimeout(timer);
  }, [search, groupKeyword]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!canFilterByCompany) return;

    let cancelled = false;

    const fetchGroups = async () => {
      try {
        const response = await listGroups({ page: 1, size: 200 });
        if (!cancelled) {
          setGroups(response.items);
        }
      } catch (err) {
        console.error(err);
      }
    };

    void fetchGroups();

    return () => {
      cancelled = true;
    };
  }, [canFilterByCompany]);

  const isClientWithoutCompany =
    currentUser.role === "CLIENT" && !currentUser.companyName?.trim();

  if (isClientWithoutCompany) {
    return (
      <div className="table-page addressbook-page">
        <div className="login-hint">회사 정보가 없습니다. 관리자에게 회사 등록을 요청하세요.</div>
      </div>
    );
  }

  return (
    <>
      <div className="table-page addressbook-page">

        {/* Auto-register toggle */}
        <div className={`ab-auto-register ${autoRegister ? "is-on" : "is-off"}`}>
          <div className="ab-auto-register-info">
            <button
              type="button"
              className={`ab-toggle-switch ${autoRegister ? "is-on" : "is-off"}`}
              onClick={toggleAutoRegister}
              aria-label="배차 접수 시 자동 주소록 등록 토글"
              aria-pressed={autoRegister}
            >
              <span className={`ab-toggle-knob ${autoRegister ? "is-on" : "is-off"}`} />
            </button>
            <div className="ab-auto-register-text">
              <span className="ab-auto-register-title">배차 접수 시 자동 주소록 등록</span>
              <span className="ab-auto-register-desc">새로운 출도착지 정보를 주소록에 자동으로 저장합니다</span>
            </div>
          </div>
          <span
            className={`ab-auto-register-badge ${autoRegister ? "is-on" : "is-off"}`}
          >
            {autoRegister ? "ON" : "OFF"}
          </span>
        </div>

        {/* Toolbar */}
        <div className="addressbook-toolbar">
          <div className="addressbook-toolbar-left">
            {canFilterByCompany && (
              <div className="addressbook-pill">
                <input
                  className="addressbook-pill-input"
                  type="text"
                  value={groupKeyword}
                  onChange={(e) => setGroupKeyword(e.target.value)}
                  placeholder="업체명"
                />
              </div>
            )}

            <div className="addressbook-pill">
              <input
                className="addressbook-pill-input"
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="장소명"
              />
            </div>
            <button
              type="button"
              className="addressbook-reset-btn"
              onClick={() => {
                setSearch("");
                setGroupKeyword("");
              }}
            >
              초기화
            </button>
          </div>

          <div className="addressbook-toolbar-right">
            <select
              className="addressbook-page-size"
              value={String(pageSize)}
              onChange={(e) => {
                const nextSize = Number(e.target.value);
                setPageSize(nextSize);
                setPage(1);
                void fetchAddressBook(search, canFilterByCompany ? groupKeyword : undefined, 1, nextSize);
              }}
              aria-label="페이지 크기"
            >
              <option value="10">10개씩 보기</option>
              <option value="20">20개씩 보기</option>
              <option value="50">50개씩 보기</option>
            </select>

            <input
              ref={excelFileInputRef}
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              aria-hidden="true"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setExcelMenuOpen(false);
                void handleImportExcelFile(file);
                e.currentTarget.value = "";
              }}
            />

            <div className="addressbook-excel-menu-wrap">
              <button
                type="button"
                className="excel-btn"
                aria-label="주소록 엑셀 메뉴"
                title="주소록 엑셀 메뉴"
                onClick={() => setExcelMenuOpen((prev) => !prev)}
              >
                <ExcelIcon />
              </button>

              {excelMenuOpen && (
                <>
                  <button
                    type="button"
                    className="addressbook-excel-menu-backdrop"
                    aria-label="엑셀 메뉴 닫기"
                    onClick={() => setExcelMenuOpen(false)}
                  />
                  <div className="addressbook-excel-menu-panel">
                    <button
                      type="button"
                      className="addressbook-excel-menu-item"
                      onClick={async () => {
                        try {
                          await downloadAddressBookImportTemplate();
                        } catch (err: any) {
                          console.error(err);
                          alert(err?.message || "주소록 템플릿 다운로드 중 오류가 발생했습니다.");
                        } finally {
                          setExcelMenuOpen(false);
                        }
                      }}
                    >
                      템플릿 다운로드
                    </button>
                    <button
                      type="button"
                      className="addressbook-excel-menu-item"
                      disabled={excelImporting}
                      onClick={() => excelFileInputRef.current?.click()}
                    >
                      {excelImporting ? "업로드 중..." : "엑셀 업로드"}
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              className="addressbook-add-btn"
              onClick={() => {
                setError(null);
                setCreateModalOpen(true);
              }}
              aria-label="주소 추가"
            >
              <Plus size={14} />
              주소록 추가
            </button>
          </div>
        </div>

        <ExcelImportResultModal
          excelImportResult={excelImportResult}
          setExcelImportResult={setExcelImportResult}
        />

        {!initialized && loading && <p>불러오는 중...</p>}
        {initialized && entries.length === 0 && (
          <div className="ab-empty-state">
            <p>아직 저장된 주소가 없습니다.</p>
          </div>
        )}

        {initialized && entries.length > 0 && (
          <table className="grid-table addressbook-table">
            <colgroup>
              <col style={{ width: "10%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "8%" }} />
              <col style={{ width: "13%" }} />
              <col style={{ width: "23%" }} />
              <col style={{ width: "7%" }} />
              <col style={{ width: "15%" }} />
              <col style={{ width: "14%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>업체명</th>
                <th>장소명</th>
                <th>담당자명</th>
                <th>연락처</th>
                <th>주소</th>
                <th>점심시간</th>
                <th>특이사항</th>
                <th>관리</th>
              </tr>
            </thead>
            <tbody>
              {pagedEntries.map((item) => (
                <tr key={item.id}>
                  <td>{item.companyName?.trim() || item.businessName?.trim() || "-"}</td>
                  <td>{item.placeName}</td>
                  <td>{item.contactName || "-"}</td>
                  <td>{formatPhoneDisplay(item.contactPhone)}</td>
                  <td className="addressbook-address-cell">
                    {item.address}
                    {item.addressDetail && (
                      <>
                        <br />
                        {item.addressDetail}
                      </>
                    )}
                  </td>
                  <td className="addressbook-muted-cell">{item.lunchTime?.trim() || "-"}</td>
                  <td className="addressbook-note-cell">
                    <div
                      className="addressbook-note-text"
                      title={item.memo?.trim() || "-"}
                    >
                      {item.memo?.trim() || "-"}
                    </div>
                  </td>
                  <td>
                    <div className="addressbook-actions">
                      <button
                        type="button"
                        className="addressbook-action-btn"
                        onClick={() => handleEditClick(item)}
                        title="수정"
                        aria-label="수정"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        className="addressbook-action-btn"
                        onClick={() => handleDelete(item)}
                        title="삭제"
                        aria-label="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                      <button
                        type="button"
                        className={`addressbook-action-btn addressbook-image-btn${item.hasImages ? " has-images" : ""}`}
                        title={item.hasImages ? `이미지 관리 (${item.imageCount ?? 0}장)` : "이미지 관리"}
                        aria-label={item.hasImages ? `이미지 관리 (${item.imageCount ?? 0}장)` : "이미지 관리"}
                        onClick={() => handleOpenImageModal(item)}
                      >
                        <ImageIcon size={14} />
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          className="addressbook-action-btn addressbook-history-btn"
                          title="변경이력"
                          onClick={() => {
                            setHistoryEntryId(item.id);
                            setHistoryEntryName(item.placeName);
                          }}
                        >
                          H
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {initialized && entries.length > 0 && (
          <div className="pagination-line">
            <button
              type="button"
              className="pager-nav-btn"
              disabled={page <= 1}
              onClick={() => {
                const nextPage = Math.max(1, page - 1);
                setPage(nextPage);
                void fetchAddressBook(search, canFilterByCompany ? groupKeyword : undefined, nextPage, pageSize);
              }}
            >
              &lt; 이전
            </button>
            <span className="page-ellipsis">총 {total}건</span>
            <div className="pager-numbers">
              {getPaginationNumbers().map((p, idx) =>
                p === "..." ? (
                  <span key={`ab-ellipsis-${idx}`} className="page-ellipsis">...</span>
                ) : (
                  <button
                    key={`ab-page-${p}`}
                    type="button"
                    onClick={() => {
                      setPage(p);
                      void fetchAddressBook(search, canFilterByCompany ? groupKeyword : undefined, p, pageSize);
                    }}
                    disabled={p === page}
                    className={`page-number-btn${p === page ? " active" : ""}`}
                  >
                    {p}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              className="pager-nav-btn"
              disabled={page >= totalPages}
              onClick={() => {
                const nextPage = Math.min(totalPages, page + 1);
                setPage(nextPage);
                void fetchAddressBook(search, canFilterByCompany ? groupKeyword : undefined, nextPage, pageSize);
              }}
            >
              다음 &gt;
            </button>
          </div>
        )}

      </div>

      <AddressBookCreateModal
        createModalOpen={createModalOpen}
        creating={creating}
        error={error}
        form={form}
        companyNameLocked={isClient ? currentUser.companyName?.trim() || "" : null}
        groups={groups}
        onBusinessNameChange={(value) =>
          handleChange({ target: { name: "businessName", value } } as any)
        }
        handleChange={handleChange}
        onAddressSearch={handleSearchFormAddress}
        handleSubmit={handleSubmit}
        setCreateModalOpen={setCreateModalOpen}
      />

      <AddressBookEditModal
        editing={editing}
        editForm={editForm}
        companyNameLocked={isClient ? currentUser.companyName?.trim() || "" : null}
        groups={groups}
        onBusinessNameChange={(value) =>
          handleEditChange({ target: { name: "businessName", value } } as any)
        }
        handleEditChange={handleEditChange}
        onAddressSearch={handleSearchEditAddress}
        handleSaveEdit={handleSaveEdit}
        setEditing={setEditing}
        setEditForm={setEditForm}
      />

      <AddressSearchModal
        isOpen={addressSearchTarget !== null}
        onClose={() => setAddressSearchTarget(null)}
        onSelect={handleAddressSearchSelect}
      />

      <AddressBookImageModal
        imageModalOpen={imageModalOpen}
        imageTarget={imageTarget}
        imageItems={imageItems}
        imageLoading={imageLoading}
        imageUploading={imageUploading}
        imageDeletingId={imageDeletingId}
        imageError={imageError}
        imagePreviewId={imagePreviewId}
        previewImage={previewImage}
        setImagePreviewId={setImagePreviewId}
        handleUploadAddressImages={handleUploadAddressImages}
        handleDeleteAddressImage={handleDeleteAddressImage}
        handleCloseImageModal={handleCloseImageModal}
        canManageImages={canManageImages}
      />

      <HistoryModal
        open={historyEntryId !== null}
        resource="ADDRESS_BOOK"
        resourceId={historyEntryId}
        title={historyEntryName}
        onClose={() => { setHistoryEntryId(null); setHistoryEntryName(""); }}
      />
    </>
  );
}
