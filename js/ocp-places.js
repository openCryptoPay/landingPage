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

  function stringList(body, key) {
    var list = body && Array.isArray(body[key]) ? body[key] : [];
    var seen = {};
    var values = [];
    list.forEach(function (value) {
      if (typeof value !== "string") return;
      var token = value.trim();
      if (!token || seen[token]) return;
      seen[token] = true;
      values.push(token);
    });
    return values;
  }

  function countryCodes(body) {
    return stringList(body, "countries");
  }

  function shopNameOptions(body) {
    var names = stringList(body, "shopNames");
    return names.map(function (name) {
      return { value: name, label: name === "others" ? "Others" : name };
    });
  }

  function providerSpec(body, name) {
    var list = body && Array.isArray(body.techProviders) ? body.techProviders : [];
    for (var i = 0; i < list.length; i += 1) {
      if (list[i] && list[i].name === name) return list[i];
    }
    return null;
  }

  function specTokens(spec, key) {
    if (!spec || !Array.isArray(spec[key])) return [];
    var seen = {};
    var values = [];
    spec[key].forEach(function (value) {
      if (typeof value !== "string") return;
      var token = value.trim();
      if (!token || seen[token]) return;
      seen[token] = true;
      values.push(token);
    });
    return values;
  }

  function assetsFor(spec, blockchain) {
    if (!spec) return [];
    if (!blockchain || !Array.isArray(spec.pairs)) return specTokens(spec, "assets");
    var seen = {};
    var values = [];
    spec.pairs.forEach(function (pair) {
      if (!pair || pair.blockchain !== blockchain || typeof pair.asset !== "string") return;
      var token = pair.asset.trim();
      if (!token || seen[token]) return;
      seen[token] = true;
      values.push(token);
    });
    values.sort(function (a, b) {
      if (a < b) return -1;
      if (a > b) return 1;
      return 0;
    });
    return values;
  }

  function filtersUrl() {
    return placesUrl.replace(/\/places$/, "/filters");
  }

  function placesRequestUrl(query) {
    var params = [];
    if (query.country) params.push("country=" + encodeURIComponent(query.country));
    if (query.shopName) params.push("shopName=" + encodeURIComponent(query.shopName));
    if (query.blockchain) params.push("blockchain=" + encodeURIComponent(query.blockchain));
    if (query.asset) params.push("asset=" + encodeURIComponent(query.asset));
    if (!params.length) return placesUrl;
    return placesUrl + "?" + params.join("&");
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

  function fillNamedSelect(select, options) {
    var previous = select.value;
    while (select.firstChild) select.removeChild(select.firstChild);
    var allOption = document.createElement("option");
    allOption.value = "";
    allOption.textContent = "All";
    select.appendChild(allOption);
    var keep = previous === "";
    options.forEach(function (item) {
      var option = document.createElement("option");
      option.value = item.value;
      option.textContent = item.label;
      if (item.value === previous) keep = true;
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

  function mountFilters(controls) {
    var row = document.createElement("div");
    row.className = "ocp-map-filters";
    controls.forEach(function (control) {
      row.appendChild(control.label);
    });
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
          var filtersBody = filters;
          var techControl = makeSelect("Tech Provider");
          var countryControl = makeSelect("Country");
          var nameControl = makeSelect("Name");
          var chainControl = makeSelect("Blockchain");
          var assetControl = makeSelect("Asset");
          fillSelect(countryControl.select, countryCodes(filtersBody));
          fillNamedSelect(nameControl.select, shopNameOptions(filtersBody));
          mountFilters([techControl, countryControl, nameControl, chainControl, assetControl]);

          var entries = [];
          var placesTask = null;

          function currentQuery() {
            return {
              country: countryControl.select.value,
              shopName: nameControl.select.value,
              blockchain: chainControl.select.value,
              asset: assetControl.select.value
            };
          }

          function queryKey(query) {
            return query.country + "\n" + query.shopName + "\n" + query.blockchain + "\n" + query.asset;
          }

          function offerForTech() {
            if (techControl.select.value === "21.gifts") {
              var gifts = providerSpec(filtersBody, "21.gifts");
              if (gifts) return gifts;
            }
            var dfx = providerSpec(filtersBody, "DFX.swiss");
            if (dfx) return dfx;
            return {
              blockchains: stringList(filtersBody, "blockchains"),
              assets: stringList(filtersBody, "assets"),
              pairs: null
            };
          }

          function syncPaymentOptions() {
            var spec = offerForTech();
            fillSelect(chainControl.select, specTokens(spec, "blockchains"));
            fillSelect(assetControl.select, assetsFor(spec, chainControl.select.value));
          }

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

          function pairMatches(item, blockchain, asset) {
            if (!item || typeof item !== "object") return false;
            if (blockchain && item.blockchain !== blockchain) return false;
            if (asset && item.asset !== asset) return false;
            return true;
          }

          // Pins with no stored payment rows follow the catalog the filter
          // response published for that provider. A missing catalog is not a match.
          function unstatedPaymentMatches(place, blockchain, asset) {
            var gifts = place.origin === "21gifts" || techProviderOf(place) === "21.gifts";
            var spec = providerSpec(filtersBody, gifts ? "21.gifts" : "DFX.swiss");
            var pairs = spec && Array.isArray(spec.pairs) ? spec.pairs : null;
            if (!pairs) return false;
            for (var i = 0; i < pairs.length; i += 1) {
              if (pairMatches(pairs[i], blockchain, asset)) return true;
            }
            return false;
          }

          // The place service may ignore a filter until a newer image is published.
          // A pin is drawn only when its own fields match the selection. A missing
          // country is not that country, and a missing shop name is not SPAR.
          function placeMatchesQuery(place, query) {
            if (!place || !finiteCoord(place.lat, -90, 90) || !finiteCoord(place.lon, -180, 180)) {
              return false;
            }
            if (query.country && place.country !== query.country) return false;
            if (query.shopName === "SPAR" && place.shopName !== "SPAR") return false;
            if (query.shopName === "others" && place.shopName === "SPAR") return false;
            if (!query.blockchain && !query.asset) return true;
            var supports = place.supports;
            if (Array.isArray(supports) && supports.length > 0) {
              for (var i = 0; i < supports.length; i += 1) {
                if (pairMatches(supports[i], query.blockchain, query.asset)) return true;
              }
              return false;
            }
            if (supports != null && !Array.isArray(supports)) return false;
            return unstatedPaymentMatches(place, query.blockchain, query.asset);
          }

          function showPlaces(places) {
            var techBefore = techControl.select.value;
            var query = currentQuery();
            var queryBefore = queryKey(query);
            entries.forEach(function (entry) {
              entry.marker.remove();
            });
            entries = [];
            var kept = [];
            places.forEach(function (place) {
              if (!placeMatchesQuery(place, query)) return;
              kept.push(place);
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
            fillSelect(techControl.select, uniqueProviders(kept));
            if (techControl.select.value !== techBefore) syncPaymentOptions();
            applyFilter();
            if (entries.length === 0) {
              setNote("No locations published yet.");
            } else {
              hideNote();
            }
            if (queryKey(currentQuery()) !== queryBefore) {
              loadPlaces().catch(function (error) {
                if (error && error.name === "AbortError") return;
                setNote("The place list could not be loaded.");
              });
            }
          }

          function loadPlaces() {
            if (placesTask) placesTask.abort();
            var controller = new AbortController();
            placesTask = controller;
            return fetch(placesRequestUrl(currentQuery()), {
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

          function reloadPlaces() {
            loadPlaces().catch(function (error) {
              if (error && error.name === "AbortError") return;
              setNote("The place list could not be loaded.");
            });
          }

          techControl.select.addEventListener("change", function () {
            var before = queryKey(currentQuery());
            syncPaymentOptions();
            applyFilter();
            if (queryKey(currentQuery()) !== before) reloadPlaces();
          });
          countryControl.select.addEventListener("change", reloadPlaces);
          nameControl.select.addEventListener("change", reloadPlaces);
          chainControl.select.addEventListener("change", function () {
            syncPaymentOptions();
            reloadPlaces();
          });
          assetControl.select.addEventListener("change", reloadPlaces);
          syncPaymentOptions();
          return loadPlaces();
        });
    })
    .catch(function (error) {
      if (error && error.name === "AbortError") return;
      setNote("The place list could not be loaded.");
    });
})();
