// Development site only. Plots locations from the OpenCryptoPay place list.
(function () {
  var host = location.hostname;
  if (host !== "dev.opencryptopay.io" && host !== "www.dev.opencryptopay.io") {
    return;
  }

  var own = document.getElementById("ocp-places");
  var google = document.getElementById("ocp-google");
  var googleLegend = document.getElementById("ocp-google-legend");
  var blurb = document.getElementById("ocp-map-blurb");
  var note = document.getElementById("ocp-places-note");
  if (!own) return;

  if (google) google.remove();
  if (googleLegend) googleLegend.hidden = true;
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

      return fetch("https://dev-api.opencryptopay.io/map/places", { credentials: "omit" })
        .then(function (response) {
          if (!response.ok) throw new Error("status");
          return response.json();
        })
        .then(function (body) {
          var places = body && Array.isArray(body.places) ? body.places : [];
          var bounds = new maplibregl.LngLatBounds();
          var count = 0;

          places.forEach(function (place) {
            if (!place || !finiteCoord(place.lat, -90, 90) || !finiteCoord(place.lon, -180, 180)) {
              return;
            }
            var marker = document.createElement("div");
            marker.className = "ocp-place-marker";
            var popupNode = document.createElement("div");
            var name = document.createElement("strong");
            name.textContent = typeof place.name === "string" && place.name ? place.name : "Location";
            popupNode.appendChild(name);
            if (typeof place.category === "string" && place.category) {
              var category = document.createElement("div");
              category.textContent = place.category;
              popupNode.appendChild(category);
            }
            new maplibregl.Marker({ element: marker })
              .setLngLat([place.lon, place.lat])
              .setPopup(new maplibregl.Popup({ offset: 16 }).setDOMContent(popupNode))
              .addTo(map);
            bounds.extend([place.lon, place.lat]);
            count += 1;
          });

          if (count === 0) {
            setNote("No locations published yet.");
            return;
          }
          if (note) note.remove();
          if (count === 1) {
            map.setCenter(bounds.getCenter());
            map.setZoom(12);
            return;
          }
          map.fitBounds(bounds, { padding: 48, maxZoom: 12 });
        });
    })
    .catch(function () {
      setNote("The place list could not be loaded.");
    });
})();
