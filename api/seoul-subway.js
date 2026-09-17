export default async function handler(req, res) {
  const subwayKey = process.env.SEOUL_SUBWAY_API_KEY;

  if (!subwayKey) {
    return res.status(500).json({
      success: false,
      error: "서울 실시간 지하철 API 키가 없습니다."
    });
  }

  const station = String(req.query.station || "").trim();

  if (!station) {
    return res.status(400).json({
      success: false,
      error: "역 이름이 필요합니다."
    });
  }

  const url =
    "http://swopenapi.seoul.go.kr/api/subway/" +
    encodeURIComponent(subwayKey) +
    "/json/realtimeStationArrival/0/100/" +
    encodeURIComponent(station);

  try {
    const response = await fetch(url);
    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      return res.status(502).json({
        success: false,
        error: "서울 지하철 API 응답을 읽을 수 없습니다."
      });
    }

    // 서울시 API 오류 확인
    if (
      data.errorMessage &&
      data.errorMessage.code &&
      data.errorMessage.code !== "INFO-000"
    ) {
      return res.status(502).json({
        success: false,
        error: data.errorMessage.message,
        code: data.errorMessage.code
      });
    }

    // 다른 형태의 오류 응답도 확인
    if (data.code && data.code !== "INFO-000") {
      return res.status(502).json({
        success: false,
        error: data.message || "서울 지하철 API 오류",
        code: data.code
      });
    }

    const list = Array.isArray(data.realtimeArrivalList)
      ? data.realtimeArrivalList
      : [];

    const arrivals = list
      .map((item) => {
        const arrivalSeconds = Number(item.barvlDt);

        return {
          station: item.statnNm || "",
          subwayId: item.subwayId || "",
          direction: item.updnLine || "",
          trainLine: item.trainLineNm || "",
          destination: item.bstatnNm || "",

          arrivalSeconds:
            Number.isFinite(arrivalSeconds)
              ? arrivalSeconds
              : null,

          arrivalMessage: item.arvlMsg2 || "",
          arrivalMessageDetail: item.arvlMsg3 || "",

          receivedAt: item.recptnDt || "",

          trainNumber: item.btrainNo || "",
          arrivalCode: item.arvlCd || ""
        };
      })

      // barvlDt가 숫자로 들어온 데이터만 사용
      .filter((item) => item.arrivalSeconds !== null)

      // 빠르게 도착하는 열차부터
      .sort((a, b) => a.arrivalSeconds - b.arrivalSeconds);

    return res.status(200).json({
      success: true,
      station: station,
      count: arrivals.length,
      arrivals: arrivals
    });

  } catch (error) {
    console.error("서울 지하철 API 호출 오류:", error);

    return res.status(500).json({
      success: false,
      error: "서울 실시간 지하철 정보를 가져오지 못했습니다."
    });
  }
}
