export default async function handler(req, res) {
  try {
    const busKey = process.env.SEOUL_BUS_LOCATION_API_KEY;

    if (!busKey) {
      return res.status(500).json({
        success: false,
        error: "SEOUL_BUS_LOCATION_API_KEY가 없습니다."
      });
    }

    const busRouteId = String(
      req.query.busRouteId || ""
    ).trim();

    if (!busRouteId) {
      return res.status(400).json({
        success: false,
        error: "busRouteId가 필요합니다."
      });
    }

    let serviceKey = busKey;

    try {
      serviceKey = decodeURIComponent(busKey);
    } catch (error) {
      serviceKey = busKey;
    }

    const url =
      "http://ws.bus.go.kr/api/rest/buspos/getBusPosByRtid" +
      "?ServiceKey=" +
      encodeURIComponent(serviceKey) +
      "&busRouteId=" +
      encodeURIComponent(busRouteId);

    const response = await fetch(url);

    const text = await response.text();

    console.log(
      "서울 버스 실시간 위치 원본:",
      text
    );

    return res.status(200).json({
      success: response.ok,
      httpStatus: response.status,
      busRouteId: busRouteId,
      raw: text
    });

  } catch (error) {
    console.error(
      "서울 버스 위치 API 오류:",
      error
    );

    return res.status(200).json({
      success: false,
      error: "서울 버스 위치 API 호출 실패",
      detail: String(
        error.message || error
      )
    });
  }
}
