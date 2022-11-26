fetch("../data/events.json")
  .then(JSON => JSON.json())
  .then(eventsData => {
    fetch("../data/names.json")
      .then(JSON => JSON.json())
      .then(namesData => {
        const sortedData = eventsData.map(event => {
          return { ...event, from: new Date(event.from) };
        }).sort(
          (objA, objB) => Number(objB.from) - Number(objA.from),
        );

        const sliderColumnsElement = document.querySelector(".columns");
        let columnAmount = 0, previousDate = new Date();
        const columnsArray = [];

        for (let i = 0; i < sortedData.length; i++) {
          const event = sortedData[i];

          if (columnAmount == 100) {
            break;
          }
          else if (event == undefined) {
            event = sortedData[i - 1];

            while (columnAmount < 100) {
              columnsArray.push(columnsArray[columnsArray.length - 1]);
              columnAmount++;
            }

            break;
          }

          if (event.from.getTime() != previousDate.getTime()) {
            columnsArray.unshift({
              date: event.from,
              height: 0,
            })

            if (event.hasOwnProperty("affected_number")) {
              columnsArray[0].height += +event["affected_number"][0] / 10;
            }

            columnAmount++;
            previousDate = event.from;
          }
          else {
            if (event.hasOwnProperty("affected_number")) {
              columnsArray[0].height += +event["affected_number"][0] / 10;
            }
          }
        }

        let columnIndex = 0;

        columnsArray.forEach(columnObj => {
          if (columnObj.height > 7.5) columnObj.height = 7.5;

          sliderColumnsElement.insertAdjacentHTML("beforeend",
            `<div class="columns__item" date="${columnObj.date}" sliderValue="${columnIndex}" style="height: ${columnObj.height}vh;"></div>`);

          columnIndex++;
        })

        const sliderElement = document.querySelector(".slider__working-part");

        sliderColumnsElement.style.top = sliderElement.getBoundingClientRect().top + window.scrollY -
          sliderColumnsElement.clientHeight + "px";

        window.addEventListener("resize", event => {
          console.log("test");
          sliderColumnsElement.style.top = sliderElement.getBoundingClientRect().top + window.scrollY -
            sliderColumnsElement.clientHeight + "px";
        })

        const sliderDatePopupElement = document.querySelector(".slider__date-popup");
        let sliderPlayInterval;
        const statistics = [];
        const statisticsElement = document.querySelector(".statistics");

        for (const affectedTypeID in namesData["en"]["affected_type"]) {
          const affectedTypeName = namesData["en"]["affected_type"][affectedTypeID];
          statistics.push({
            id: affectedTypeID,
            name: affectedTypeName,
            number: 0,
          })
        }

        const sliderChangingValueEvent = event => {
          let sliderTickStep = ((sliderElement.getBoundingClientRect().right - 8) - sliderElement.getBoundingClientRect().left) / 100;
          sliderDatePopupElement.style.top = sliderElement.getBoundingClientRect().bottom + window.scrollY + sliderDatePopupElement.clientHeight + "px";
          sliderDatePopupElement.style.left = sliderElement.getBoundingClientRect().left - sliderDatePopupElement.clientWidth / 2 + 8 + sliderElement.value * sliderTickStep + "px";
          sliderDatePopupElement.innerText = columnsArray[sliderElement.value].date.toLocaleDateString("en-us", { day: 'numeric', month: "short", year: "numeric" });

          if (sliderElement.value >= 99) {
            clearInterval(sliderPlayInterval);
            sliderPlayInterval = undefined;
            document.querySelector(".main-part__play-button > img").setAttribute("src", "./img/play-button.svg");
          }

          statistics.forEach(statistic => statistic.number = 0);

          let choosenDate = columnsArray[sliderElement.value].date;
          let choosenDateIndex = sortedData.findIndex(event => event.from.getTime() == choosenDate.getTime());
          const mapElement = document.querySelector(".map__image");
          const mapPointsContainer = document.querySelector(".map__points");
          const mapElementWidth = mapElement.clientWidth;
          const mapElementHeight = mapElement.clientHeight;

          function convertGeoToPixel(latitude, longitude, mapElementWidth, mapElementHeight, mapLngLeft, mapLngRight, mapLatBottom) {
            const mapLatBottomRad = mapLatBottom * Math.PI / 180
            const latitudeRad = latitude * Math.PI / 180
            const mapLngDelta = (mapLngRight - mapLngLeft)

            const worldMapWidth = ((mapElementWidth / mapLngDelta) * 360) / (2 * Math.PI)
            const mapOffsetY = (worldMapWidth / 2 * Math.log((1 + Math.sin(mapLatBottomRad)) / (1 - Math.sin(mapLatBottomRad))))

            const x = (longitude - mapLngLeft) * (mapElementWidth / mapLngDelta)
            const y = mapElementHeight - ((worldMapWidth / 2 * Math.log((1 + Math.sin(latitudeRad)) / (1 - Math.sin(latitudeRad)))) - mapOffsetY)

            return { x, y }
          }

          while (mapPointsContainer.firstChild && mapPointsContainer.removeChild(mapPointsContainer.firstChild));

          for (let i = choosenDateIndex; i < sortedData.length; i++) {
            const event = sortedData[i];
            if (event.hasOwnProperty("affected_number")) {
              const statisticID = statistics.findIndex(statistic => statistic.id == +event["affected_type"][0]);
              statistics[statisticID].number += +event["affected_number"][0];
            }

            const pointPositionObj = convertGeoToPixel(event.lat, event.lon, mapElementWidth, mapElementHeight, 22.13, 40.21, 44.2);
            mapPointsContainer.insertAdjacentHTML("beforeend", `
            <div class="map__point" style="top: ${pointPositionObj.y}px; left: ${pointPositionObj.x}px;"></div>`)
          }

          let statisticsHTML = "";

          statistics.forEach(statisticItem => {
            statisticsHTML += `
            <li class="statistics__item">
              <h2 class="statistics__number">${statisticItem.number}</h2>
              <h3 class="statistics__name">${statisticItem.name}</h3>
            </li>`;
          })

          statisticsElement.innerHTML = statisticsHTML;
        }

        document.addEventListener("click", event => {
          let target = event.target.closest(".columns__item");
          if (target) {
            sliderElement.value = +target.getAttribute("sliderValue");
            sliderChangingValueEvent();
          }
        })

        sliderChangingValueEvent();

        sliderElement.addEventListener("input", sliderChangingValueEvent);

        document.querySelector(".main-part__play-button").addEventListener("click", event => {
          let target = event.target.closest(".main-part__play-button");
          if (target) {
            if (sliderPlayInterval == undefined) {
              sliderPlayInterval = setInterval(() => {
                sliderElement.value++;
                sliderChangingValueEvent();
              }, 1500);
              target.querySelector(".main-part__play-button > img").setAttribute("src", "./img/pause-button.svg");
            }
            else {
              clearInterval(sliderPlayInterval);
              sliderPlayInterval = undefined;
              target.querySelector(".main-part__play-button > img").setAttribute("src", "./img/play-button.svg");
            }
          }
        })
      })
  })