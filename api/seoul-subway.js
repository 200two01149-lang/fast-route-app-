export default async function handler(req, res) {
  const subwayKey = process.env.SEOUL_SUBWAY_API_KEY;

  if (!subwayKey) {
    return res.status(500).json({
      error: "SEOUL_SUBWAY_API_KEY가 없습니다."
    });
  }

  const station = req.query.station || "서울";

  const url =
    "http://swopenapi.seoul.go.kr/api/subway/" +
    encodeURIComponent(subwayKey) +
    "/json/realtimeStationArrival/0/20/" +
    encodeURIComponent(station);

  try {
    const response = await fetch(url);

    const text = await response.text();

    console.log("HTTP STATUS:", response.status);
    console.log("서울 지하철 원본 응답:", text);

    let parsedData = null;

    try {
      parsedData = JSON.parse(text);
    } catch (error) {
      // JSON이 아니면 아래에서 원문 그대로 보여줌
    }

    return res.status(200).json({
      test: "서울 지하철 원본 응답 확인",
      station: station,
      httpStatus: response.status,

      // 인증키 자체는 출력하지 않음
      requestInfo: {
        service: "realtimeStationArrival",
        startIndex: 0,
        endIndex: 20
      },

      parsedData: parsedData,
      rawText: parsedData ? undefined : text
    });

  } catch (error) {
    console.error("서울 지하철 API 호출 실패:", error);

    return res.status(500).json({
      error: "서울 지하철 API 호출 실패",
      detail: error.message
    });
  }
}
