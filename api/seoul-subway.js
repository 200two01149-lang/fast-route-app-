export default async function handler(req, res) {
  const subwayKey = process.env.SEOUL_SUBWAY_API_KEY;

  if (!subwayKey) {
    return res.status(500).json({
      error: "서울 실시간 지하철 API 키가 없습니다."
    });
  }

  // 주소창에서 ?station=새절 처럼 역 이름을 받을 수 있음
  const station = req.query.station || "새절";

  const url =
    "http://swopenapi.seoul.go.kr/api/subway/" +
    encodeURIComponent(subwayKey) +
    "/json/realtimeStationArrival/0/20/" +
    encodeURIComponent(station);

  try {
    const response = await fetch(url);

    const text = await response.text();

    console.log("서울 지하철 API 응답:", text);

    // JSON으로 변환 시도
    let data;

    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({
        error: "서울 지하철 API 응답이 JSON 형식이 아닙니다.",
        response: text
      });
    }

    // 서울 API 자체 오류 확인
    if (data.errorMessage) {
      return res.status(200).json({
        success: false,
        station: station,
        error: data.errorMessage
      });
    }

    const arrivals = Array.isArray(data.realtimeArrivalList)
      ? data.realtimeArrivalList
      : [];

    // 우리가 나중에 사용할 정보만 보기 쉽게 정리
    const simplified = arrivals.map((item) => ({
      station: item.statnNm,
      line: item.trainLineNm,
      subwayId: item.subwayId,

      // 열차 도착까지 남은 시간(초)
      arrivalSeconds: Number(item.barvlDt),

      // 예: "전역 출발", "2분 후"
      arrivalMessage: item.arvlMsg2,

      // 예: "응암 도착"
      arrivalMessageDetail: item.arvlMsg3,

      // 상/하행 정보
      direction: item.updnLine,

      // 종착역
      destination: item.bstatnNm,

      // 데이터 수신 시각
      receivedAt: item.recptnDt
    }));

    return res.status(200).json({
      success: true,
      station: station,
      count: simplified.length,
      arrivals: simplified
    });

  } catch (error) {
    console.error("서울 지하철 API 오류:", error);

    return res.status(500).json({
      error: "서울 실시간 지하철 API 호출 실패",
      detail: error.message
    });
  }
}
