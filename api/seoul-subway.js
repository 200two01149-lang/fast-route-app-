export default async function handler(req, res) {

  const subwayKey =
    process.env.SEOUL_SUBWAY_API_KEY;


  // ==========================================
  // API 키 확인
  // ==========================================

  if (!subwayKey) {

    return res.status(500).json({

      success: false,

      error:
        "서울 실시간 지하철 API 키가 없습니다."

    });

  }


  // ==========================================
  // 역 이름
  // ==========================================

  const station =
    String(
      req.query.station || ""
    ).trim();


  if (!station) {

    return res.status(400).json({

      success: false,

      error:
        "역 이름이 필요합니다."

    });

  }


  // ==========================================
  // 서울 실시간 지하철 API
  // ==========================================

  const url =

    "http://swopenapi.seoul.go.kr/api/subway/" +

    encodeURIComponent(
      subwayKey
    ) +

    "/json/realtimeStationArrival/0/100/" +

    encodeURIComponent(
      station
    );


  try {

    const response =
      await fetch(url);


    const text =
      await response.text();


    let data;


    try {

      data =
        JSON.parse(text);

    }

    catch (error) {

      console.error(
        "서울 지하철 JSON 변환 실패:",
        text
      );


      return res.status(502).json({

        success: false,

        error:
          "서울 지하철 API 응답을 읽을 수 없습니다."

      });

    }


    console.log(
      "서울 지하철 원본 응답:",
      station,
      data
    );


    // ==========================================
    // 서울 API 결과 코드 찾기
    // ==========================================

    const code =

      data?.errorMessage?.code ||

      data?.code ||

      "";


    const message =

      data?.errorMessage?.message ||

      data?.message ||

      "";


    // ==========================================
    // INFO-200
    //
    // 오류가 아니라
    // "현재 실시간 데이터 없음"으로 처리
    // ==========================================

    if (code === "INFO-200") {

      return res.status(200).json({

        success: true,

        realtimeAvailable: false,

        station: station,

        count: 0,

        arrivals: [],

        message:
          "현재 이 역의 실시간 도착정보가 없습니다."

      });

    }


    // ==========================================
    // 정상 이외의 실제 API 오류
    // ==========================================

    if (
      code &&
      code !== "INFO-000"
    ) {

      console.error(
        "서울 지하철 API 오류:",
        code,
        message
      );


      return res.status(502).json({

        success: false,

        realtimeAvailable: false,

        station: station,

        error:
          message ||
          "서울 지하철 API 오류",

        code: code

      });

    }


    // ==========================================
    // 실시간 목록
    // ==========================================

    const list =
      Array.isArray(
        data.realtimeArrivalList
      )

        ? data.realtimeArrivalList

        : [];


    // ==========================================
    // 필요한 데이터만 정리
    // ==========================================

    const arrivals = list

      .map(
        (item) => {

          const arrivalSeconds =
            Number(
              item.barvlDt
            );


          return {

            station:
              item.statnNm || "",

            subwayId:
              item.subwayId || "",

            direction:
              item.updnLine || "",

            trainLine:
              item.trainLineNm || "",

            destination:
              item.bstatnNm || "",

            arrivalSeconds:
              Number.isFinite(
                arrivalSeconds
              )

                ? arrivalSeconds

                : null,

            arrivalMessage:
              item.arvlMsg2 || "",

            arrivalMessageDetail:
              item.arvlMsg3 || "",

            receivedAt:
              item.recptnDt || "",

            trainNumber:
              item.btrainNo || "",

            arrivalCode:
              item.arvlCd || ""

          };

        }
      )

      .filter(
        (item) =>
          item.arrivalSeconds !== null
      )

      .sort(
        (a, b) =>
          a.arrivalSeconds -
          b.arrivalSeconds
      );


    // ==========================================
    // 정상 반환
    // ==========================================

    return res.status(200).json({

      success: true,

      realtimeAvailable:
        arrivals.length > 0,

      station: station,

      count:
        arrivals.length,

      arrivals:
        arrivals

    });

  }


  catch (error) {

    console.error(
      "서울 지하철 API 호출 오류:",
      error
    );


    return res.status(500).json({

      success: false,

      realtimeAvailable: false,

      station: station,

      error:
        "서울 실시간 지하철 정보를 가져오지 못했습니다."

    });

  }

}
