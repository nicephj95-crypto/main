// src/AddressBookPage.tsx
import { downloadAddressBookImportTemplate } from "./api/client";
import type { AuthUser } from "./LoginPanel";
import { ExcelIcon, SearchIcon } from "./ui/icons";
import { useAddressBook } from "./hooks/useAddressBook";
import { ExcelImportResultModal } from "./components/ExcelImportResultModal";
import { AddressBookCreateModal } from "./components/AddressBookCreateModal";
import { AddressBookEditModal } from "./components/AddressBookEditModal";
import { AddressBookImageModal } from "./components/AddressBookImageModal";

function AddressImageMiniIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="white"
      />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path
        d="m7 17 3.6-3.6 2.3 2.3L16.2 12l2.8 5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type AddressBookPageProps = {
  currentUser: AuthUser;
};

export function AddressBookPage({ currentUser }: AddressBookPageProps) {
  const {
    isAdmin,
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
    pageJumpInput,
    setPageJumpInput,
    totalPages,
    getPaginationNumbers,
    // Create modal
    createModalOpen,
    setCreateModalOpen,
    creating,
    form,
    handleChange,
    handleSubmit,
    // Edit modal
    editing,
    setEditing,
    editForm,
    setEditForm,
    handleEditChange,
    handleEditClick,
    handleSaveEdit,
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
    resolveImageUrl,
  } = useAddressBook(currentUser);

  return (
    <>
      <div className="table-page addressbook-page">
        <div className="addressbook-toolbar">
          <div className="addressbook-toolbar-left">
            <div className="addressbook-pill addressbook-pill-place">
              <input
                className="addressbook-pill-input"
                type="text"
                value={groupKeyword}
                onChange={(e) => setGroupKeyword(e.target.value)}
                placeholder="그룹명"
              />
            </div>

            <div className="addressbook-pill addressbook-pill-group">
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
              className="round-icon-btn addressbook-search-btn"
              onClick={() => fetchAddressBook(search, isAdmin ? groupKeyword : undefined)}
              aria-label="검색"
              title="검색"
            >
              <SearchIcon />
            </button>
            <button
              type="button"
              className="addressbook-reset-btn"
              onClick={() => {
                setSearch("");
                setGroupKeyword("");
                fetchAddressBook(undefined, undefined);
              }}
            >
              초기화
            </button>
          </div>

          <div className="addressbook-toolbar-right">
            <div className="addressbook-page-size-wrap">
              <select
                className="pill-select addressbook-page-size"
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                aria-label="페이지 크기"
              >
                <option value="10">10개씩 보기</option>
                <option value="20">20개씩 보기</option>
                <option value="50">50개씩 보기</option>
              </select>
            </div>

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
            <button
              type="button"
              className="addressbook-add-btn"
              onClick={() => {
                setError(null);
                setCreateModalOpen(true);
              }}
              aria-label="주소 추가"
              title="주소 추가"
            >
              +
            </button>

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
          </div>
        </div>

        <ExcelImportResultModal
          excelImportResult={excelImportResult}
          setExcelImportResult={setExcelImportResult}
        />

        {loading && <p>불러오는 중...</p>}
        {!loading && entries.length === 0 && (
          <p style={{ fontSize: 13, color: "#777" }}>
            아직 저장된 주소가 없습니다.
          </p>
        )}

        {!loading && entries.length > 0 && (
          <table className="grid-table addressbook-table">
            <colgroup>
              <col style={{ width: "10.6%" }} />
              <col style={{ width: "10.6%" }} />
              <col style={{ width: "8.0%" }} />
              <col style={{ width: "13.7%" }} />
              <col style={{ width: "20.6%" }} />
              <col style={{ width: "7.5%" }} />
              <col style={{ width: "17.3%" }} />
              <col style={{ width: "11.7%" }} />
            </colgroup>
            <thead>
              <tr>
                <th>그룹명</th>
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
                  <td>{item.businessName?.trim() || "그룹 미지정"}</td>
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
                    {item.memo?.trim() || "-"}
                  </td>
                  <td>
                    <div className="addressbook-actions">
                      <button
                        type="button"
                        className={`addressbook-action-btn addressbook-image-btn ${item.hasImages ? "has-images" : ""}`}
                        title={item.hasImages ? `이미지 관리 (${item.imageCount ?? 0}장)` : "이미지 관리"}
                        aria-label={item.hasImages ? `이미지 관리 (${item.imageCount ?? 0}장)` : "이미지 관리"}
                        onClick={() => handleOpenImageModal(item)}
                      >
                        <AddressImageMiniIcon />
                      </button>
                      <button
                        type="button"
                        className="addressbook-action-btn"
                        onClick={() => handleEditClick(item)}
                        title="수정"
                        aria-label="수정"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        className="addressbook-action-btn"
                        onClick={() => handleDelete(item)}
                        title="삭제"
                        aria-label="삭제"
                      >
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {!loading && entries.length > 0 && (
          <div className="pagination-line">
            <div className="pager-stack">
              <div className="pager-row">
                <button
                  type="button"
                  className="pager-nav-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                >
                  &lt; 이전
                </button>
                <div className="pager-numbers">
                  {getPaginationNumbers().map((p, idx) =>
                    p === "..." ? (
                      <span key={`ab-ellipsis-${idx}`} className="page-ellipsis">...</span>
                    ) : (
                      <button
                        key={`ab-page-${p}`}
                        type="button"
                        onClick={() => setPage(p)}
                        disabled={p === page}
                        className={`page-number-btn ${p === page ? "active" : ""}`}
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
                  onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                >
                  다음 &gt;
                </button>
              </div>
              <div className="pager-jump-row">
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={pageJumpInput}
                  onChange={(e) => setPageJumpInput(e.target.value)}
                  className="pager-jump-input"
                  aria-label="페이지 번호 입력"
                />
                <span className="pager-jump-total">/ {totalPages}</span>
                <button
                  type="button"
                  className="pager-jump-btn"
                  onClick={() => {
                    const n = Number(pageJumpInput);
                    if (!Number.isFinite(n)) return;
                    setPage(Math.min(totalPages, Math.max(1, Math.trunc(n))));
                  }}
                >
                  이동
                </button>
              </div>
            </div>
          </div>
        )}

      </div>

      <AddressBookCreateModal
        createModalOpen={createModalOpen}
        creating={creating}
        error={error}
        form={form}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        setCreateModalOpen={setCreateModalOpen}
      />

      <AddressBookEditModal
        editing={editing}
        editForm={editForm}
        handleEditChange={handleEditChange}
        handleSaveEdit={handleSaveEdit}
        setEditing={setEditing}
        setEditForm={setEditForm}
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
        resolveImageUrl={resolveImageUrl}
        handleCloseImageModal={handleCloseImageModal}
      />
    </>
  );
}
