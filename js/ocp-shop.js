// Shop page (shop.php): copy button, map with one pin, and a full-screen photo viewer.
// Every value is read from the server-rendered DOM; nothing is inserted as HTML.
(function () {
  document.querySelectorAll(".ocp-shop-copy").forEach(function (button) {
    var label = button.textContent;
    var timer = null;
    function flash(text) {
      button.textContent = text;
      clearTimeout(timer);
      timer = setTimeout(function () {
        button.textContent = label;
      }, 1500);
    }
    button.addEventListener("click", function () {
      var text = button.getAttribute("data-copy") || "";
      if (!navigator.clipboard) {
        flash("Copy failed");
        return;
      }
      navigator.clipboard.writeText(text).then(
        function () {
          flash("Copied");
        },
        function () {
          flash("Copy failed");
        }
      );
    });
  });

  // A map that cannot start (no WebGL) must not stop the photo viewer below.
  var mapNode = document.getElementById("ocp-shop-map");
  if (mapNode && window.maplibregl) {
    var lat = Number(mapNode.getAttribute("data-lat"));
    var lon = Number(mapNode.getAttribute("data-lon"));
    if (isFinite(lat) && isFinite(lon)) {
      try {
        var map = new maplibregl.Map({
          container: mapNode,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [lon, lat],
          zoom: 15
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
        var pin = document.createElement("div");
        pin.className = "ocp-place-marker";
        new maplibregl.Marker({ element: pin }).setLngLat([lon, lat]).addTo(map);
      } catch (error) {
        mapNode.hidden = true;
      }
    }
  }

  var viewer = document.getElementById("ocp-shop-viewer");
  var photos = Array.prototype.slice.call(document.querySelectorAll(".ocp-shop-photo"));
  if (!viewer || photos.length === 0) return;
  var image = viewer.querySelector("img");
  var caption = viewer.querySelector("figcaption");
  var live = viewer.querySelector(".ocp-shop-live");
  var current = 0;
  var opener = null;
  var touchStartX = null;

  function show(index) {
    current = (index + photos.length) % photos.length;
    var photo = photos[current];
    image.src = photo.getAttribute("data-full") || "";
    var text = (photo.getAttribute("data-caption") || "").trim();
    image.alt = text || photo.querySelector("img").alt;
    caption.textContent = text;
    caption.hidden = text === "";
    live.textContent = "Photo " + (current + 1) + " of " + photos.length + (text === "" ? "" : ": " + text);
  }

  function open(index) {
    opener = document.activeElement;
    // Shown before show() fills the live region, so screen readers announce the first photo.
    viewer.hidden = false;
    show(index);
    document.body.classList.add("ocp-shop-viewer-open");
    viewer.querySelector(".ocp-shop-viewer-close").focus();
  }

  function close() {
    viewer.hidden = true;
    document.body.classList.remove("ocp-shop-viewer-open");
    if (opener && opener.focus) opener.focus();
  }

  photos.forEach(function (photo, index) {
    photo.addEventListener("click", function () {
      open(index);
    });
  });
  var single = photos.length === 1;
  viewer.querySelector(".ocp-shop-viewer-prev").hidden = single;
  viewer.querySelector(".ocp-shop-viewer-next").hidden = single;
  viewer.querySelector(".ocp-shop-viewer-close").addEventListener("click", close);
  viewer.querySelector(".ocp-shop-viewer-prev").addEventListener("click", function () {
    show(current - 1);
  });
  viewer.querySelector(".ocp-shop-viewer-next").addEventListener("click", function () {
    show(current + 1);
  });
  viewer.addEventListener("click", function (event) {
    if (event.target === viewer) close();
  });
  document.addEventListener("keydown", function (event) {
    if (viewer.hidden) return;
    if (event.key === "Tab") {
      var buttons = Array.prototype.filter.call(viewer.querySelectorAll("button"), function (button) {
        return !button.hidden;
      });
      var at = buttons.indexOf(document.activeElement);
      var next = event.shiftKey ? at - 1 : at + 1;
      buttons[(next + buttons.length) % buttons.length].focus();
      event.preventDefault();
      return;
    }
    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft") show(current - 1);
    if (event.key === "ArrowRight") show(current + 1);
  });
  viewer.addEventListener("touchstart", function (event) {
    touchStartX = event.touches.length === 1 ? event.touches[0].clientX : null;
  }, { passive: true });
  viewer.addEventListener("touchend", function (event) {
    if (touchStartX === null || event.changedTouches.length !== 1) return;
    var dx = event.changedTouches[0].clientX - touchStartX;
    touchStartX = null;
    if (Math.abs(dx) < 40) return;
    show(dx < 0 ? current + 1 : current - 1);
  });
})();
