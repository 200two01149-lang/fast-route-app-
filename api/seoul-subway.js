export default async function handler(req, res) {
  const subwayKey =
    process.env.SEOUL_SUBWAY_API_KEY;

  if (!subwayKey) {
    return res.status(500).json({
      success: false,
      error:
        "SEOUL_SUBWAY_API_KEY가 없습니다."
    });
  }

  const station =
    String(
      req.query.station || ""
    ).trim();

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
    const response =
      await fetch(url);

    const text =
      await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch (error) {
      console.error(
        "지하철 JSON 변환 실패:",
        text
      );

      return res.status(502).json({
        success: false,
        error:
          "지하철 API 응답을 읽지 못했습니다."
      });
    }

    console.log(
      "서울 지하철 응답:",
      station,
      data
    );

    const code =
      data?.errorMessage?.code ||
      data?.code ||
      "";

    const message =
      data?.errorMessage?.message ||
      data?.message ||
      "";

    if (code === "INFO-200") {
      return res.status(200).json({
        success: true,
        realtimeAvailable: false,
        station,
        arrivals: [],
        message:
          "현재 이 역의 실시간 도착정보가 없습니다."
      });
    }

    if (
      code &&
      code !== "INFO-000"
    ) {
      return res.status(502).json({
        success: false,
        realtimeAvailable: false,
        station,
        code,
        error:
          message ||
          "서울 지하철 API 오류"
      });
    }

    const list =
      Array.isArray(
        data.realtimeArrivalList
      )
        ? data.realtimeArrivalList
        : [];

    const now =
      Date.now();

    const arrivals =
      list
        .map(function(item) {
          const originalSeconds =
            Number(item.barvlDt);

          if (
            !Number.isFinite(
              originalSeconds
            )
          ) {
            return null;
          }

          let ageSeconds = 0;

          if (item.recptnDt) {
            const received =
              parseSeoulDate(
                item.recptnDt
              );

            if (received) {
              ageSeconds =
                Math.max(
                  0,
                  Math.floor(
                    (now -
                      received.getTime()) /
                    1000
                  )
                );
            }
          }

          const adjustedSeconds =
            Math.max(
              0,
              originalSeconds -
              ageSeconds
            );

          return {
            station:
              item.statnNm || "",

            subwayId:
              String(
                item.subwayId || ""
              ),

            direction:
              item.updnLine || "",

            trainLine:
              item.trainLineNm || "",

            destination:
              item.bstatnNm || "",

            arrivalSeconds:
              adjustedSeconds,

            originalArrivalSeconds:
              originalSeconds,

            dataAgeSeconds:
              ageSeconds,

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
        })
        .filter(function(item) {
          return (
            item &&
            item.arrivalSeconds > 0
          );
        })
        .sort(function(a, b) {
          return (
            a.arrivalSeconds -
            b.arrivalSeconds
          );
        });

    return res.status(200).json({
      success: true,
      realtimeAvailable:
        arrivals.length > 0,
      station,
      count: arrivals.length,
      arrivals
    });

  } catch (error) {
    console.error(
      "서울 지하철 API 호출 오류:",
      error
    );

    return res.status(500).json({
      success: false,
      realtimeAvailable: false,
      station,
      error:
        "서울 실시간 지하철 정보를 가져오지 못했습니다."
    });
  }
}


function parseSeoulDate(value) {
  try {
    const text =
      String(value).trim();

    const match =
      text.match(
        /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/
      );

    if (!match) {
      return null;
    }

    const iso =
      match[1] + "-" +
      match[2] + "-" +
      match[3] + "T" +
      match[4] + ":" +
      match[5] + ":" +
      match[6] +
      "+09:00";

    const date =
      new Date(iso);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return null;
    }

    return date;

  } catch (error) {
    return null;
  }
}
