export default async function handler(req, res) {

  // 우리가 허용할 웹사이트
  res.setHeader(
    "Access-Control-Allow-Origin",
    "https://200two01149-lang.github.io"
  );

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "GET 요청만 가능합니다."
    });
  }

  const {
    startX,
    startY,
    endX,
    endY
  } = req.query;


  // 좌표가 빠졌는지 확인
  if (!startX || !startY || !endX || !endY) {

    return res.status(400).json({
      error: "출발지와 도착지 좌표가 필요합니다."
    });

  }


  // Vercel에 숨겨둔 카카오 REST API 키
  const kakaoKey =
    process.env.KAKAO_REST_API_KEY;


  if (!kakaoKey) {

    return res.status(500).json({
      error: "카카오 API 키가 설정되지 않았습니다."
    });

  }


  const url =
    "https://dapi.kakao.com/v2/routing/publictraffic" +
    "?start_x=" + encodeURIComponent(startX) +
    "&start_y=" + encodeURIComponent(startY) +
    "&end_x=" + encodeURIComponent(endX) +
    "&end_y=" + encodeURIComponent(endY);


  try {

    const response = await fetch(url, {

      headers: {
        Authorization:
          "KakaoAK " + kakaoKey
      }

    });


    const data =
      await response.json();


    return res.status(response.status).json(data);


  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "카카오 서버에 요청하는 중 문제가 생겼습니다."
    });

  }

}
