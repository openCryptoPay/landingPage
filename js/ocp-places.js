// Public and development sites. Plots locations from the OpenCryptoPay place list.
(function () {
  var host = location.hostname;
  var placesUrl = null;
  if (host === "opencryptopay.io" || host === "www.opencryptopay.io") {
    placesUrl = "https://api.opencryptopay.io/map/places";
  } else if (host === "dev.opencryptopay.io" || host === "www.dev.opencryptopay.io") {
    placesUrl = "https://dev-api.opencryptopay.io/map/places";
  }
  if (!placesUrl) {
    return;
  }

  var own = document.getElementById("ocp-places");
  var google = document.getElementById("ocp-google");
  var googleLegend = document.getElementById("ocp-google-legend");
  var blurb = document.getElementById("ocp-map-blurb");
  var note = document.getElementById("ocp-places-note");
  if (!own) return;

  if (google) google.remove();
  if (googleLegend) googleLegend.remove();
  own.hidden = false;
  if (note) note.hidden = false;
  if (blurb) {
    blurb.textContent = "Locations published in the OpenCryptoPay place list.";
  }

  function setNote(text) {
    if (!note) return;
    note.hidden = false;
    note.textContent = text;
  }

  function hideNote() {
    if (!note) return;
    note.hidden = true;
  }

  function loadCss(href) {
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.onload = function () { resolve(); };
      script.onerror = function () { reject(new Error("script")); };
      document.body.appendChild(script);
    });
  }

  function finiteCoord(value, min, max) {
    return typeof value === "number" && isFinite(value) && value >= min && value <= max;
  }

  function techProviderOf(place) {
    var value = place.techProvider;
    if (typeof value !== "string" || !value.trim()) {
      return "DFX.swiss";
    }
    return value;
  }

  function uniqueProviders(places) {
    var seen = {};
    var names = [];
    places.forEach(function (place) {
      if (!place) return;
      var name = techProviderOf(place);
      if (seen[name]) return;
      seen[name] = true;
      names.push(name);
    });
    names.sort(function (a, b) {
      return a.localeCompare(b);
    });
    return names;
  }

  function countryCodes(body) {
    var list = body && Array.isArray(body.countries) ? body.countries : [];
    var seen = {};
    var codes = [];
    list.forEach(function (value) {
      if (typeof value !== "string") return;
      var code = value.trim();
      if (!code || seen[code]) return;
      seen[code] = true;
      codes.push(code);
    });
    return codes;
  }

  function filtersUrl() {
    return placesUrl.replace(/\/places$/, "/filters");
  }

  function placesRequestUrl(country) {
    if (!country) return placesUrl;
    return placesUrl + "?country=" + encodeURIComponent(country);
  }

  function fillSelect(select, values) {
    var previous = select.value;
    while (select.firstChild) select.removeChild(select.firstChild);
    var allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All";
    select.appendChild(allOption);
    var keep = previous === "";
    values.forEach(function (name) {
      var option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      if (name === previous) keep = true;
      select.appendChild(option);
    });
    select.value = keep ? previous : "";
  }

  function makeSelect(captionText) {
    var label = document.createElement("label");
    label.className = "ocp-tech-provider";
    var caption = document.createElement("span");
    caption.className = "ocp-tech-provider-label";
    caption.appendChild(document.createTextNode(captionText));
    label.appendChild(caption);
    var select = document.createElement("select");
    label.appendChild(select);
    fillSelect(select, []);
    return { label: label, select: select };
  }

  function mountFilters(countrySelect, techSelect) {
    var row = document.createElement("div");
    row.className = "ocp-map-filters";
    row.appendChild(countrySelect.label);
    row.appendChild(techSelect.label);
    var header = document.querySelector(".home-map_header-wrapper");
    if (header) {
      header.appendChild(row);
    } else {
      var mapWrapper = document.querySelector(".map-wrapper");
      var before = mapWrapper || own;
      before.parentNode.insertBefore(row, before);
    }
  }

  loadCss("css/maplibre-gl.css");
  loadCss("css/ocp-places.css");

  loadScript("js/maplibre-gl.js")
    .then(function () {
      var map = new maplibregl.Map({
        container: own,
        style: "https://tiles.openfreemap.org/styles/liberty",
        center: [8.23, 46.8],
        zoom: 7
      });
      map.addControl(new maplibregl.NavigationControl(), "top-right");

      return fetch(filtersUrl(), { credentials: "omit" })
        .then(function (response) {
          if (!response.ok) throw new Error("status");
          return response.json();
        })
        .then(function (filters) {
          var countryControl = makeSelect("Country");
          var techControl = makeSelect("Tech Provider");
          fillSelect(countryControl.select, countryCodes(filters));
          mountFilters(countryControl, techControl);

          var entries = [];
          var placesTask = null;

          function applyFilter() {
            var selected = techControl.select.value;
            var visible = [];
            entries.forEach(function (entry) {
              if (!selected || entry.provider === selected) {
                entry.marker.addTo(map);
                visible.push(entry.marker);
              } else {
                entry.marker.remove();
              }
            });
            if (visible.length === 0) {
              return;
            }
            if (visible.length === 1) {
              map.setCenter(visible[0].getLngLat());
              map.setZoom(12);
              return;
            }
            var bounds = new maplibregl.LngLatBounds();
            visible.forEach(function (marker) {
              bounds.extend(marker.getLngLat());
            });
            map.fitBounds(bounds, { padding: 48, maxZoom: 12 });
          }

          function showPlaces(places) {
            entries.forEach(function (entry) {
              entry.marker.remove();
            });
            entries = [];
            places.forEach(function (place) {
              if (!place || !finiteCoord(place.lat, -90, 90) || !finiteCoord(place.lon, -180, 180)) {
                return;
              }
              var markerEl = document.createElement("div");
              markerEl.className = "ocp-place-marker";
              var popupNode = document.createElement("div");
              var name = document.createElement("strong");
              name.textContent = typeof place.name === "string" && place.name ? place.name : "Location";
              popupNode.appendChild(name);
              if (typeof place.category === "string" && place.category) {
                var category = document.createElement("div");
                category.textContent = place.category;
                popupNode.appendChild(category);
              }
              var marker = new maplibregl.Marker({ element: markerEl })
                .setLngLat([place.lon, place.lat])
                .setPopup(new maplibregl.Popup({ offset: 16 }).setDOMContent(popupNode));
              entries.push({ marker: marker, provider: techProviderOf(place) });
            });
            fillSelect(techControl.select, uniqueProviders(places));
            applyFilter();
            if (entries.length === 0) {
              setNote("No locations published yet.");
              return;
            }
            hideNote();
          }

          function loadPlaces(country) {
            if (placesTask) placesTask.abort();
            var controller = new AbortController();
            placesTask = controller;
            return fetch(placesRequestUrl(country), {
              credentials: "omit",
              signal: controller.signal
            }).then(function (response) {
              if (!response.ok) throw new Error("status");
              return response.json();
            }).then(function (body) {
              if (placesTask !== controller) return;
              var places = body && Array.isArray(body.places) ? body.places : [];
              showPlaces(places);
            });
          }

          techControl.select.addEventListener("change", applyFilter);
          countryControl.select.addEventListener("change", function () {
            loadPlaces(countryControl.select.value).catch(function (error) {
              if (error && error.name === "AbortError") return;
              setNote("The place list could not be loaded.");
            });
          });
          return loadPlaces("");
        });
    })
    .catch(function (error) {
      if (error && error.name === "AbortError") return;
      setNote("The place list could not be loaded.");
    });
})();
