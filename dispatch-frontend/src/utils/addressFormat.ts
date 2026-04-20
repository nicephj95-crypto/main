type PostcodeAddressData = {
  address?: string;
  roadAddress?: string;
  autoRoadAddress?: string;
  jibunAddress?: string;
  autoJibunAddress?: string;
  buildingName?: string;
  bname?: string;
  apartment?: string;
};

function normalizeAddress(value?: string | null) {
  return (value ?? "").trim();
}

function buildCompactJibunDetail(roadAddress: string, jibunAddress: string) {
  const roadTokens = normalizeAddress(roadAddress).split(/\s+/).filter(Boolean);
  const jibunTokens = normalizeAddress(jibunAddress).split(/\s+/).filter(Boolean);

  if (jibunTokens.length === 0) return "";

  let sharedPrefixLength = 0;
  while (
    sharedPrefixLength < roadTokens.length &&
    sharedPrefixLength < jibunTokens.length &&
    roadTokens[sharedPrefixLength] === jibunTokens[sharedPrefixLength]
  ) {
    sharedPrefixLength += 1;
  }

  const compact = jibunTokens.slice(sharedPrefixLength).join(" ").trim();
  return compact || jibunAddress;
}

function buildRoadAddressDetail(data: PostcodeAddressData) {
  const parts: string[] = [];
  const roadAddress = normalizeAddress(data.roadAddress) || normalizeAddress(data.autoRoadAddress);
  const jibunAddress = normalizeAddress(data.jibunAddress) || normalizeAddress(data.autoJibunAddress);
  const bname = normalizeAddress(data.bname);
  const buildingName = normalizeAddress(data.buildingName);
  const isApartment = normalizeAddress(data.apartment).toUpperCase() === "Y";
  const compactJibunDetail =
    roadAddress && jibunAddress
      ? buildCompactJibunDetail(roadAddress, jibunAddress)
      : jibunAddress;

  if (compactJibunDetail) {
    parts.push(compactJibunDetail);
  } else if (bname) {
    parts.push(bname);
  }

  if (buildingName && (isApartment || !parts.includes(buildingName))) {
    parts.push(buildingName);
  }

  return parts.join(", ");
}

export function formatSelectedAddress(data: PostcodeAddressData) {
  const roadAddress = normalizeAddress(data.roadAddress) || normalizeAddress(data.autoRoadAddress);
  const jibunAddress = normalizeAddress(data.jibunAddress) || normalizeAddress(data.autoJibunAddress);
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
