export default async function handler(req, res) {

  const seoulKey = process.env.SEOUL_API_KEY;

  if (!seoulKey) {
    return res.status(500).json({
      error: "서울 API 키가 없습니다."
    });
  }

  // 테스트: 서울 버스 도착정보 API 연결 확인
  const url =
    "http://ws.bus.go.kr/api/rest/arrive/getArrInfoByRouteAll" +
    "?serviceKey=" + encodeURIComponent(seoulKey) +
    "&busRouteId=100100118" +
    "&resultType=json";

  try {

    const response = await fetch(url);

    const text = await response.text();

    console.log("서울 버스 API 응답:", text);

    return res.status(200).json({
      success: true,
      response: text
    });

  } catch (error) {

    console.error("서울 버스 API 오류:", error);

    return res.status(500).json({
      error: "서울 버스 API 연결 실패"
    });

  }
}
