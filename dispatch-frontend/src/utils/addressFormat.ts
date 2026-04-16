type PostcodeAddressData = {
  address?: string;
  roadAddress?: string;
  jibunAddress?: string;
  buildingName?: string;
  bname?: string;
  apartment?: string;
};

function normalizeAddress(value?: string | null) {
  return (value ?? "").trim();
}

function buildRoadAddressDetail(data: PostcodeAddressData) {
  const parts: string[] = [];
  const bname = normalizeAddress(data.bname);
  const buildingName = normalizeAddress(data.buildingName);
  const isApartment = normalizeAddress(data.apartment).toUpperCase() === "Y";

  if (bname) {
    parts.push(bname);
  }

  if (buildingName && (isApartment || !parts.includes(buildingName))) {
    parts.push(buildingName);
  }

  return parts.join(", ");
}

export function formatSelectedAddress(data: PostcodeAddressData) {
  const roadAddress = normalizeAddress(data.roadAddress);
  const jibunAddress = normalizeAddress(data.jibunAddress);
  const fallbackAddress = normalizeAddress(data.address);
  const roadDetail = buildRoadAddressDetail(data);

  if (roadAddress) {
    if (roadDetail && !roadAddress.includes(`(${roadDetail})`)) {
      return `${roadAddress} (${roadDetail})`;
    }
    return roadAddress;
  }

  if (jibunAddress) return jibunAddress;
  return fallbackAddress;
}
