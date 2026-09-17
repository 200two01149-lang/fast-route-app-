export default async function handler(req, res) {
  const {
    startX,
    startY,
    endX,
    endY
  } = req.query;

  if (
    !startX ||
    !startY ||
    !endX ||
    !endY
  ) {
    return res.status(400).json({
      success: false,
      error: "출발지와 도착지 좌표가 필요합니다."
    });
  }

  const kakaoKey =
    process.env.KAKAO_REST_API_KEY;

  if (!kakaoKey) {
    return res.status(500).json({
      success: false,
      error: "KAKAO_REST_API_KEY가 없습니다."
    });
  }

  const url =
    "https://dapi.kakao.com/v2/routing/publictraffic" +
    "?start_x=" + encodeURIComponent(startX) +
    "&start_y=" + encodeURIComponent(startY) +
    "&end_x=" + encodeURIComponent(endX) +
    "&end_y=" + encodeURIComponent(endY);

  try {
    const response =
      await fetch(url, {
        headers: {
          Authorization:
            "KakaoAK " + kakaoKey
        }
      });

    const data =
      await response.json();

    if (!response.ok) {
      console.error(
        "Kakao 대중교통 API 오류:",
        data
      );

      return res
        .status(response.status)
        .json(data);
    }

    return res
      .status(200)
      .json(data);

  } catch (error) {
    console.error(
      "Kakao 경로 호출 오류:",
      error
    );

    return res.status(500).json({
      success: false,
      error:
        "대중교통 경로를 가져오지 못했습니다."
    });
  }
}
