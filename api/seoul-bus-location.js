from pathlib import Path

code = r'''// api/seoul-bus-location.js
// Vercel 환경변수: SEOUL_BUS_LOCATION_API_KEY
//
// 테스트:
// /api/seoul-bus-location?busRouteId=100100389
//
// 선택:
// /api/seoul-bus-location?busRouteId=100100022&startOrd=1&endOrd=113

function normalizeServiceKey(value) {
  const key = String(value || "").trim();

  // 공공데이터포털의 Encoding 키를 넣은 경우 %25 이중 인코딩을 막기 위해
  // 한 번 원래 값으로 복원한 뒤 URLSearchParams가 정확히 한 번 인코딩하게 한다.
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

function textOf(node, tag) {
  const match = node.match(
    new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i")
  );
  return match ? match[1].trim() : "";
}

function numberOrNull(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function parseXmlItems(xml) {
  const blocks = xml.match(/<itemList>[\s\S]*?<\/itemList>/gi) || [];

  return blocks.map((block) => ({
    routeId: textOf(block, "routeId"),
    vehId: textOf(block, "vehId"),
    plainNo: textOf(block, "plainNo"),

    // 현재 버스가 지나온/위치한 구간 관련 정보
    sectionId: textOf(block, "sectionId"),
    sectOrd: numberOrNull(textOf(block, "sectOrd")),
    sectDist: numberOrNull(textOf(block, "sectDist")),
    fullSectDist: numberOrNull(textOf(block, "fullSectDist")),
    lastStnId: textOf(block, "lastStnId"),

    // WGS84 좌표. 응답에 따라 tmX/tmY 또는 gpsX/gpsY가 올 수 있어 둘 다 대응.
    longitude:
      numberOrNull(textOf(block, "tmX")) ??
      numberOrNull(textOf(block, "gpsX")),
    latitude:
      numberOrNull(textOf(block, "tmY")) ??
      numberOrNull(textOf(block, "gpsY")),

    stopFlag: numberOrNull(textOf(block, "stopFlag")),
    busType: numberOrNull(textOf(block, "busType")),
    congestion: numberOrNull(
      textOf(block, "congetion") || textOf(block, "congestion")
    ),
    isFullFlag: numberOrNull(textOf(block, "isFullFlag")),
    isLast: numberOrNull(textOf(block, "islastyn")),
    isRunning: numberOrNull(textOf(block, "isrunyn")),
    dataTime: textOf(block, "dataTm")
  }));
}

function parseXmlHeader(xml) {
  return {
    code:
      textOf(xml, "headerCd") ||
      textOf(xml, "resultCode") ||
      "",
    message:
      textOf(xml, "headerMsg") ||
      textOf(xml, "resultMsg") ||
      "",
    itemCount: numberOrNull(textOf(xml, "itemCount"))
  };
}

function normalizeJsonItems(data) {
  const body =
    data?.msgBody ||
    data?.ServiceResult?.msgBody ||
    data?.response?.body ||
    data?.response?.body?.items ||
    {};

  let list =
    body?.itemList ??
    body?.items?.item ??
    body?.item ??
    [];

  if (!Array.isArray(list)) {
    list = list ? [list] : [];
  }

  return list.map((item) => ({
    routeId: String(item.routeId ?? item.busRouteId ?? ""),
    vehId: String(item.vehId ?? ""),
    plainNo: String(item.plainNo ?? ""),
    sectionId: String(item.sectionId ?? ""),
    sectOrd: numberOrNull(item.sectOrd),
    sectDist: numberOrNull(item.sectDist),
    fullSectDist: numberOrNull(item.fullSectDist),
    lastStnId: String(item.lastStnId ?? ""),
    longitude:
      numberOrNull(item.tmX) ??
      numberOrNull(item.gpsX),
    latitude:
      numberOrNull(item.tmY) ??
      numberOrNull(item.gpsY),
    stopFlag: numberOrNull(item.stopFlag),
    busType: numberOrNull(item.busType),
    congestion: numberOrNull(item.congetion ?? item.congestion),
    isFullFlag: numberOrNull(item.isFullFlag),
    isLast: numberOrNull(item.islastyn),
    isRunning: numberOrNull(item.isrunyn),
    dataTime: String(item.dataTm ?? "")
  }));
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");

  const rawKey = process.env.SEOUL_BUS_LOCATION_API_KEY;

  if (!rawKey) {
    return res.status(500).json({
      success: false,
      error: "SEOUL_BUS_LOCATION_API_KEY 환경변수가 없습니다."
    });
  }

  const busRouteId = String(req.query.busRouteId || "").trim();
  const startOrdRaw = String(req.query.startOrd || "").trim();
  const endOrdRaw = String(req.query.endOrd || "").trim();

  if (!busRouteId) {
    return res.status(400).json({
      success: false,
      error: "busRouteId가 필요합니다.",
      example: "/api/seoul-bus-location?busRouteId=100100389"
    });
  }

  const serviceKey = normalizeServiceKey(rawKey);

  // startOrd/endOrd가 둘 다 있으면 특정 구간,
  // 없으면 해당 노선 전체의 실시간 위치를 조회한다.
  const useRange = Boolean(startOrdRaw && endOrdRaw);
  const endpoint = useRange
    ? "getBusPosByRouteSt"
    : "getBusPosByRtid";

  const params = new URLSearchParams();
  params.set("ServiceKey", serviceKey);
  params.set("busRouteId", busRouteId);

  if (useRange) {
    params.set("startOrd", startOrdRaw);
    params.set("endOrd", endOrdRaw);
  }

  // JSON을 지원하는 응답이면 JSON으로 받고,
  // 서버가 XML을 반환해도 아래에서 자동 처리한다.
  params.set("resultType", "json");

  const url =
    `http://ws.bus.go.kr/api/rest/buspos/${endpoint}?${params.toString()}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json, application/xml, text/xml;q=0.9, */*;q=0.8"
      }
    });

    const text = await response.text();
    const trimmed = text.trim();

    if (!response.ok) {
      console.error("서울 버스 위치 API HTTP 오류:", response.status, trimmed);

      return res.status(response.status).json({
        success: false,
        httpStatus: response.status,
        error: "서울 버스 위치 API 요청에 실패했습니다.",
        detail: trimmed.slice(0, 1000)
      });
    }

    let buses = [];
    let apiCode = "";
    let apiMessage = "";
    let format = "xml";

    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      format = "json";

      let data;
      try {
        data = JSON.parse(trimmed);
      } catch {
        return res.status(502).json({
          success: false,
          error: "서울 버스 위치 API의 JSON 응답을 읽지 못했습니다."
        });
      }

      buses = normalizeJsonItems(data);

      const header =
        data?.msgHeader ||
        data?.ServiceResult?.msgHeader ||
        data?.response?.header ||
        {};

      apiCode = String(
        header.headerCd ??
        header.resultCode ??
        ""
      );

      apiMessage = String(
        header.headerMsg ??
        header.resultMsg ??
        ""
      );
    } else {
      const header = parseXmlHeader(trimmed);
      apiCode = header.code;
      apiMessage = header.message;
      buses = parseXmlItems(trimmed);
    }

    // 서울 버스 API에서 정상 코드는 보통 0.
    if (apiCode && apiCode !== "0" && apiCode !== "00") {
      console.error("서울 버스 위치 API 오류:", apiCode, apiMessage);

      return res.status(502).json({
        success: false,
        apiCode,
        error: apiMessage || "서울 버스 위치 API 오류가 발생했습니다."
      });
    }

    // 노선 진행 순서 기준으로 정렬해 두면 프론트에서
    // '몇 정거장 전' 계산을 붙이기 쉽다.
    buses.sort((a, b) => {
      const aa = Number.isFinite(a.sectOrd) ? a.sectOrd : Number.MAX_SAFE_INTEGER;
      const bb = Number.isFinite(b.sectOrd) ? b.sectOrd : Number.MAX_SAFE_INTEGER;
      return aa - bb;
    });

    return res.status(200).json({
      success: true,
      realtimeAvailable: buses.length > 0,
      busRouteId,
      queryType: useRange ? "route-section" : "route-all",
      count: buses.length,
      buses,
      sourceFormat: format,
      message:
        buses.length > 0
          ? "실시간 버스 위치를 가져왔습니다."
          : "현재 이 노선에서 조회된 실시간 버스 위치가 없습니다."
    });
  } catch (error) {
    console.error("서울 버스 위치 API 호출 오류:", error);

    return res.status(500).json({
      success: false,
      error: "서울 버스 위치 정보를 가져오지 못했습니다.",
      detail: String(error?.message || error)
    });
  }
}
'''

path = Path("/mnt/data/seoul-bus-location.js")
path.write_text(code, encoding="utf-8")
print(f"created: {path} ({path.stat().st_size} bytes)")
