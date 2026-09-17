export default async function handler(req, res) {

  const busKey =
    process.env.SEOUL_BUS_API_KEY;

  if (!busKey) {
    return res.status(500).json({
      success: false,
      error: "SEOUL_BUS_API_KEY가 없습니다."
    });
  }

  const station =
    String(
      req.query.station || "서울역"
    ).trim();

  const url =
    "http://ws.bus.go.kr/api/rest/stationinfo/getStationByName" +
    "?serviceKey=" +
    encodeURIComponent(busKey) +
    "&stSrch=" +
    encodeURIComponent(station) +
    "&resultType=json";

  try {

    const response =
      await fetch(url);

    const text =
      await response.text();

    console.log(
      "서울 버스 원본 응답:",
      text
    );

    let data = null;

    try {
      data = JSON.parse(text);
    }
    catch (error) {

      return res.status(200).json({
        success: false,
        station: station,
        httpStatus: response.status,
        message: "JSON이 아닌 응답이 왔습니다.",
        raw: text.substring(0, 1500)
      });

    }

    return res.status(200).json({
      success: response.ok,
      station: station,
      httpStatus: response.status,
      data: data
    });

  }

  catch (error) {

    console.error(
      "서울 버스 API 호출 오류:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "서울 버스 API 호출 실패",
      detail: String(
        error.message || error
      )
    });

  }

}
