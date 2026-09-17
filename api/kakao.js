export default async function handler(req, res) {

  // 출발지와 도착지 좌표 받기
  const {
    startX,
    startY,
    endX,
    endY
  } = req.query;


  // 좌표가 없으면 중단
  if (!startX || !startY || !endX || !endY) {

    return res.status(400).json({
      error: "출발지와 도착지 좌표가 필요합니다."
    });

  }


  // Vercel에 저장해둔 REST API 키 가져오기
  const kakaoKey =
    process.env.KAKAO_REST_API_KEY;


  // 키가 없는 경우
  if (!kakaoKey) {

    return res.status(500).json({
      error: "Kakao REST API 키가 없습니다."
    });

  }


  // 카카오 대중교통 API 주소
  const kakaoUrl =
    "https://dapi.kakao.com/v2/routing/publictraffic" +
    "?start_x=" + encodeURIComponent(startX) +
    "&start_y=" + encodeURIComponent(startY) +
    "&end_x=" + encodeURIComponent(endX) +
    "&end_y=" + encodeURIComponent(endY);


  try {

    // 카카오 서버에 요청
    const response = await fetch(
      kakaoUrl,
      {
        method: "GET",

        headers: {
          Authorization:
            "KakaoAK " + kakaoKey
        }
      }
    );


    // 카카오가 보내준 데이터
    const data = await response.json();


    // 오류가 발생한 경우
    if (!response.ok) {

      console.log(
        "카카오 API 오류:",
        data
      );

      return res
        .status(response.status)
        .json(data);

    }


    // 성공!
    // 카카오 데이터를 그대로 웹페이지에 보내기
    return res.status(200).json(data);


  } catch (error) {

    console.log(error);

    return res.status(500).json({
      error: "대중교통 경로 요청 중 오류가 발생했습니다."
    });

  }

}
