export default async function handler(req, res) {
  const busKey =
    process.env.SEOUL_BUS_API_KEY;

  if (!busKey) {
    return res.status(500).json({
      success: false,
      error:
        "SEOUL_BUS_API_KEY가 없습니다."
    });
  }

  const station =
    String(
      req.query.station || ""
    ).trim();

  const buses =
    String(
      req.query.buses || ""
    )
      .split(",")
      .map(function(value) {
        return value.trim();
      })
      .filter(Boolean);

  if (!station) {
    return res.status(400).json({
      success: false,
      error:
        "버스 정류장 이름이 필요합니다."
    });
  }

  if (buses.length === 0) {
    return res.status(400).json({
      success: false,
      error:
        "버스 번호가 필요합니다."
    });
  }

  try {
    const serviceKey =
      normalizeServiceKey(
        busKey
      );

    // ==========================================
    // 1. 정류장 이름 검색
    // ==========================================

    const stationUrl =
      buildBusUrl(
        "http://ws.bus.go.kr/api/rest/stationinfo/getStationByName",
        {
          serviceKey,
          stSrch: station,
          resultType: "json"
        }
      );

    const stationData =
      await fetchBusJson(
        stationUrl
      );

    const stationItems =
      getItemList(
        stationData
      );

    if (
      stationItems.length === 0
    ) {
      return res.status(200).json({
        success: true,
        realtimeAvailable: false,
        station,
        buses,
        arrivals: [],
        message:
          "일치하는 서울 버스 정류장을 찾지 못했습니다."
      });
    }

    const results = [];

    // 같은 이름 정류장이 여러 개일 수 있으므로
    // 앞쪽 후보들을 확인한다.
    for (
      let s = 0;
      s < Math.min(
        stationItems.length,
        8
      );
      s++
    ) {
      const stationItem =
        stationItems[s];

      const arsId =
        String(
          stationItem.arsId || ""
        ).trim();

      const stId =
        String(
          stationItem.stId || ""
        ).trim();

      if (!arsId) {
        continue;
      }

      // ========================================
      // 2. 정류장 경유 노선
      // ========================================

      const routeUrl =
        buildBusUrl(
          "http://ws.bus.go.kr/api/rest/stationinfo/getRouteByStation",
          {
            serviceKey,
            arsId,
            resultType: "json"
          }
        );

      let routeData;

      try {
        routeData =
          await fetchBusJson(
            routeUrl
          );
      } catch (error) {
        console.error(
          "정류장 경유노선 오류:",
          arsId,
          error
        );

        continue;
      }

      const routeItems =
        getItemList(
          routeData
        );

      for (
        let r = 0;
        r < routeItems.length;
        r++
      ) {
        const route =
          routeItems[r];

        const routeName =
          String(
            route.rtNm ||
            route.busRouteNm ||
            ""
          ).trim();

        if (
          !matchesBusNumber(
            routeName,
            buses
          )
        ) {
          continue;
        }

        const busRouteId =
          String(
            route.busRouteId || ""
          ).trim();

        const staOrd =
          Number(
            route.staOrd ||
            route.seq ||
            0
          );

        if (
          !busRouteId ||
          !stId ||
          !staOrd
        ) {
          continue;
        }

        // ======================================
        // 3. 해당 노선 도착정보
        // ======================================

        const arrivalUrl =
          buildBusUrl(
            "http://ws.bus.go.kr/api/rest/arrive/getArrInfoByRoute",
            {
              serviceKey,
              stId,
              busRouteId,
              ord: staOrd,
              resultType: "json"
            }
          );

        try {
          const arrivalData =
            await fetchBusJson(
              arrivalUrl
            );

          const arrivalItems =
            getItemList(
              arrivalData
            );

          for (
            let a = 0;
            a < arrivalItems.length;
            a++
          ) {
            const item =
              arrivalItems[a];

            const firstSeconds =
              positiveNumber(
                item.traTime1
              );

            const secondSeconds =
              positiveNumber(
                item.traTime2
              );

            if (
              firstSeconds !== null
            ) {
              results.push({
                station:
                  stationItem.stNm ||
                  station,

                arsId,

                stId,

                busNumber:
                  routeName,

                busRouteId,

                staOrd,

                arrivalSeconds:
                  firstSeconds,

                arrivalMessage:
                  item.arrmsg1 || "",

                vehicleOrder: 1
              });
            }

            if (
              secondSeconds !== null
            ) {
              results.push({
                station:
                  stationItem.stNm ||
                  station,

                arsId,

                stId,

                busNumber:
                  routeName,

                busRouteId,

                staOrd,

                arrivalSeconds:
                  secondSeconds,

                arrivalMessage:
                  item.arrmsg2 || "",

                vehicleOrder: 2
              });
            }
          }

        } catch (error) {
          console.error(
            "버스 도착정보 오류:",
            routeName,
            error
          );
        }
      }
    }

    const unique =
      removeDuplicateArrivals(
        results
      );

    unique.sort(
      function(a, b) {
        return (
          a.arrivalSeconds -
          b.arrivalSeconds
        );
      }
    );

    return res.status(200).json({
      success: true,
      realtimeAvailable:
        unique.length > 0,
      station,
      buses,
      count:
        unique.length,
      arrivals:
        unique,
      message:
        unique.length > 0
          ? ""
          : "해당 정류장과 버스의 실시간 도착정보를 찾지 못했습니다."
    });

  } catch (error) {
    console.error(
      "서울 버스 API 오류:",
      error
    );

    return res.status(500).json({
      success: false,
      realtimeAvailable: false,
      station,
      buses,
      error:
        error.message ||
        "서울 버스 정보를 가져오지 못했습니다."
    });
  }
}


// 이미 Encoding 키를 저장했더라도
// 한 번 디코딩한 뒤 URL에서 한 번만 인코딩한다.
function normalizeServiceKey(
  key
) {
  const value =
    String(key).trim();

  try {
    return decodeURIComponent(
      value
    );
  } catch (error) {
    return value;
  }
}


function buildBusUrl(
  base,
  params
) {
  const url =
    new URL(base);

  Object.keys(params)
    .forEach(function(key) {
      url.searchParams.set(
        key,
        params[key]
      );
    });

  return url.toString();
}


async function fetchBusJson(
  url
) {
  const response =
    await fetch(url);

  const text =
    await response.text();

  let data;

  try {
    data =
      JSON.parse(text);
  } catch (error) {
    throw new Error(
      "서울 버스 API가 JSON이 아닌 응답을 반환했습니다."
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.message ||
      data?.error ||
      "서울 버스 API HTTP " +
      response.status
    );
  }

  const header =
    data?.msgHeader ||
    data?.ServiceResult?.msgHeader;

  if (
    header &&
    String(
      header.headerCd || "0"
    ) !== "0"
  ) {
    throw new Error(
      header.headerMsg ||
      "서울 버스 API 오류"
    );
  }

  return data;
}


function getItemList(
  data
) {
  let list =
    data?.msgBody?.itemList;

  if (
    list === undefined ||
    list === null
  ) {
    return [];
  }

  if (!Array.isArray(list)) {
    list = [list];
  }

  return list;
}


function matchesBusNumber(
  routeName,
  buses
) {
  const target =
    normalizeBusName(
      routeName
    );

  return buses.some(
    function(bus) {
      return (
        normalizeBusName(bus) ===
        target
      );
    }
  );
}


function normalizeBusName(
  value
) {
  return String(
    value || ""
  )
    .replace(/\s+/g, "")
    .toUpperCase();
}


function positiveNumber(
  value
) {
  const number =
    Number(value);

  if (
    !Number.isFinite(number) ||
    number <= 0
  ) {
    return null;
  }

  return number;
}


function removeDuplicateArrivals(
  list
) {
  const seen =
    new Set();

  return list.filter(
    function(item) {
      const key =
        item.arsId +
        "|" +
        item.busRouteId +
        "|" +
        item.arrivalSeconds +
        "|" +
        item.vehicleOrder;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    }
  );
}
