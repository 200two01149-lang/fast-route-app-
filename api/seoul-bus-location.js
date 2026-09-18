export default async function handler(req, res) {
  try {
    const apiKey =
      process.env.SEOUL_BUS_LOCATION_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error:
          "SEOUL_BUS_LOCATION_API_KEY가 없습니다."
      });
    }

    /*
      stdgCd = 지자체 코드

      기본값은 테스트용으로
      API 문서에 있는 4686000000 사용.

      실제 앱에서는 현재 경로 지역에 맞는
      stdgCd를 넘겨주게 만들 예정.
    */
    const stdgCd =
      String(
        req.query.stdgCd ||
        "4686000000"
      ).trim();

    const pageNo =
      String(
        req.query.pageNo || "1"
      );

    /*
      실시간 버스를 여러 대 받아야 하므로
      문서 기본값 10보다 크게 요청
    */
    const numOfRows =
      String(
        req.query.numOfRows || "100"
      );

    /*
      공공데이터포털 Encoding 키가
      들어가 있어도 이중 인코딩되지 않도록 처리
    */
    let serviceKey = apiKey;

    try {
      serviceKey =
        decodeURIComponent(apiKey);
    } catch (error) {
      serviceKey = apiKey;
    }

    const params =
      new URLSearchParams();

    params.set(
      "serviceKey",
      serviceKey
    );

    params.set(
      "pageNo",
      pageNo
    );

    params.set(
      "numOfRows",
      numOfRows
    );

    params.set(
      "type",
      "JSON"
    );

    params.set(
      "stdgCd",
      stdgCd
    );

    const url =
      "https://apis.data.go.kr/B551982/rte/rtm_loc_info?" +
      params.toString();

    console.log(
      "버스 실시간 위치 요청:",
      {
        stdgCd,
        pageNo,
        numOfRows
      }
    );

    const response =
      await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });

    const text =
      await response.text();

    console.log(
      "버스 실시간 위치 HTTP:",
      response.status
    );

    /*
      JSON 응답 변환
    */
    let data;

    try {
      data =
        JSON.parse(text);
    } catch (error) {

      console.error(
        "JSON 변환 실패:",
        text
      );

      return res.status(200).json({
        success: false,

        httpStatus:
          response.status,

        error:
          "API가 JSON이 아닌 응답을 반환했습니다.",

        raw:
          text.substring(
            0,
            3000
          )
      });
    }

    /*
      API 자체 HTTP 오류
    */
    if (!response.ok) {

      console.error(
        "버스 위치 API 오류:",
        data
      );

      return res.status(200).json({
        success: false,

        httpStatus:
          response.status,

        stdgCd:
          stdgCd,

        data:
          data
      });
    }

    /*
      아직 응답 구조를 임의로 가정하지 않는다.

      우선 실제 API 데이터를 그대로 받아서
      정상 작동 여부 확인.
    */
    return res.status(200).json({
      success: true,

      httpStatus:
        response.status,

      stdgCd:
        stdgCd,

      data:
        data
    });

  } catch (error) {

    console.error(
      "버스 실시간 위치 API 호출 실패:",
      error
    );

    return res.status(200).json({
      success: false,

      error:
        "버스 실시간 위치 API 호출 실패",

      detail:
        String(
          error?.message ||
          error
        )
    });
  }
}
