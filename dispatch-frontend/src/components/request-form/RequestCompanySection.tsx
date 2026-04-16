import { CompanySearchSelect } from "../CompanySearchSelect";
import type { CompanyName, GroupContact, GroupManagementGroup } from "../../api/types";

type RequestCompanySectionProps = {
  visible: boolean;
  companies: CompanyName[];
  groups: GroupManagementGroup[];
  selectedCompanyName: string;
  selectedCompanyContactName: string;
  selectedCompanyContactPhone: string;
  setSelectedCompanyName: (value: string) => void;
  setSelectedCompanyContactName: (value: string) => void;
  setSelectedCompanyContactPhone: (value: string) => void;
};

export function RequestCompanySection({
  visible,
  companies,
  groups,
  selectedCompanyName,
  selectedCompanyContactName,
  selectedCompanyContactPhone,
  setSelectedCompanyName,
  setSelectedCompanyContactName,
  setSelectedCompanyContactPhone,
}: RequestCompanySectionProps) {
  if (!visible) {
    return null;
  }

  const selectedGroup = groups.find((group) => group.name === selectedCompanyName) ?? null;
  const selectedCompanyContacts: GroupContact[] = selectedGroup?.contacts ?? [];
  const selectedCompanyContactValue =
    selectedCompanyContacts.find(
      (contact) =>
        contact.name === selectedCompanyContactName &&
        (contact.phone ?? "") === (selectedCompanyContactPhone ?? "")
    )?.id ?? "";

  return (
    <div className="dispatch-company-wrap">
      <CompanySearchSelect
        value={selectedCompanyName}
        onChange={(nextCompanyName) => {
          setSelectedCompanyName(nextCompanyName);
          setSelectedCompanyContactName("");
          setSelectedCompanyContactPhone("");
        }}
        companyNames={companies}
        placeholder="업체를 선택하세요 *"
      />
      {selectedCompanyName && (
        <div style={{ marginTop: 10 }}>
          <select
            className="dispatch-company-select-full"
            value={selectedCompanyContactValue}
            onChange={(e) => {
              const nextId = Number(e.target.value);
              const nextContact =
                selectedCompanyContacts.find((contact) => contact.id === nextId) ?? null;
              setSelectedCompanyContactName(nextContact?.name ?? "");
              setSelectedCompanyContactPhone(nextContact?.phone ?? "");
            }}
          >
            <option value="">
              {selectedCompanyContacts.length > 0
                ? "업체 담당자를 선택하세요"
                : "등록된 담당자가 없습니다"}
            </option>
            {selectedCompanyContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.departmentName} · {contact.name}
                {contact.phone ? ` · ${contact.phone}` : ""}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
