// Public and development sites. Plots locations from the OpenCryptoPay place list.
(function () {
  var host = location.hostname;
  var placesUrl = null;
  var siteOrigin = "https://opencryptopay.io";
  if (host === "opencryptopay.io" || host === "www.opencryptopay.io") {
    placesUrl = "https://api.opencryptopay.io/map/places";
  } else if (host === "dev.opencryptopay.io" || host === "www.dev.opencryptopay.io") {
    placesUrl = "https://dev-api.opencryptopay.io/map/places";
    siteOrigin = "https://dev.opencryptopay.io";
  }
  if (!placesUrl) {
    return;
  }

  var own = document.getElementById("ocp-places");
  var table = document.getElementById("ocp-place-table");
  if (!own && !table) return;

  var google = document.getElementById("ocp-google");
  var googleLegend = document.getElementById("ocp-google-legend");
  var blurb = document.getElementById("ocp-map-blurb");
  var note = document.getElementById("ocp-places-note");
  var tableWrap = document.getElementById("ocp-place-table-wrap");
  var csvButton = document.getElementById("ocp-stores-csv");
  var storesView = "table";
  var placesLoadFailed = false;
  var rowsRendered = false;
  var lastRowCount = 0;
  if (csvButton) {
    csvButton.addEventListener("click", exportStoresCsv);
  }
  bindActivityHelp();
  if (own) {
    if (google) google.remove();
    if (googleLegend) googleLegend.remove();
    own.hidden = false;
    if (note) note.hidden = false;
    if (blurb) {
      blurb.textContent = "Locations published in the OpenCryptoPay place list.";
    }
    var storesLink = document.querySelector(".ocp-stores-link");
    if (storesLink) storesLink.hidden = false;
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

  var ACTIVITY_LABELS = {
    daily: "Daily",
    within7Days: "Weekly",
    within30Days: "Monthly",
    olderThan30Days: "Idle",
    none: "None"
  };

  var ACTIVITY_SWATCHES = {
    daily: "is-daily",
    within7Days: "is-weekly",
    within30Days: "is-monthly",
    olderThan30Days: "is-idle",
    none: "is-none"
  };

  var symbolSelects = [];
  var symbolSelectSeq = 0;

  function iconUrl(value) {
    if (typeof value !== "string") return "";
    var url = value.trim();
    if (!/^https:\/\//.test(url)) return "";
    return url;
  }

  function symbolMap(body, group) {
    var symbols = body && body.symbols;
    var map = symbols && symbols[group];
    if (!map || typeof map !== "object" || Array.isArray(map)) return {};
    return map;
  }

  function activityOptions(body) {
    return stringList(body, "activities").map(function (value) {
      var option = {
        value: value,
        label: ACTIVITY_LABELS[value] || value
      };
      if (ACTIVITY_SWATCHES[value]) option.swatch = ACTIVITY_SWATCHES[value];
      return option;
    });
  }

  function namedSymbolOptions(names, icons) {
    return names.map(function (name) {
      var option = { value: name, label: name };
      var url = iconUrl(icons[name]);
      if (url) option.icon = url;
      return option;
    });
  }

  function paintSymbolMark(node, item) {
    while (node.firstChild) node.removeChild(node.firstChild);
    if (!item || (!item.swatch && !item.icon)) {
      node.hidden = true;
      return;
    }
    node.hidden = false;
    if (item.swatch) {
      var swatch = document.createElement("span");
      swatch.className = "ocp-activity-swatch " + item.swatch;
      swatch.setAttribute("aria-hidden", "true");
      node.appendChild(swatch);
      return;
    }
    var image = document.createElement("img");
    image.className = "ocp-symbol-filter-icon";
    image.alt = "";
    image.src = item.icon;
    image.addEventListener("error", function () {
      node.hidden = true;
    });
    node.appendChild(image);
  }

  function makeSymbolSelect(captionText) {
    var root = document.createElement("div");
    root.className = "ocp-tech-provider ocp-symbol-filter";
    var caption = document.createElement("span");
    caption.className = "ocp-tech-provider-label";
    caption.appendChild(document.createTextNode(captionText));
    root.appendChild(caption);

    var button = document.createElement("button");
    button.type = "button";
    button.className = "ocp-symbol-filter-value";
    button.setAttribute("aria-haspopup", "listbox");
    button.setAttribute("aria-expanded", "false");
    var valueMark = document.createElement("span");
    valueMark.className = "ocp-symbol-filter-mark";
    valueMark.hidden = true;
    var valueText = document.createElement("span");
    valueText.className = "ocp-symbol-filter-text";
    valueText.appendChild(document.createTextNode("All"));
    button.appendChild(valueMark);
    button.appendChild(valueText);
    root.appendChild(button);

    var menu = document.createElement("div");
    menu.className = "ocp-symbol-filter-menu";
    menu.hidden = true;
    menu.setAttribute("role", "listbox");
    var controlId = "ocp-symbol-filter-" + symbolSelectSeq;
    symbolSelectSeq += 1;
    caption.id = controlId + "-label";
    valueText.id = controlId + "-value";
    button.id = controlId;
    menu.id = controlId + "-menu";
    button.setAttribute("aria-labelledby", caption.id + " " + valueText.id);
    button.setAttribute("aria-controls", menu.id);
    root.appendChild(menu);

    var current = "";
    var options = [];
    var listeners = [];
    var open = false;
    var control = {
      root: root,
      close: function () {
        open = false;
        root.classList.remove("is-open");
        menu.hidden = true;
        button.setAttribute("aria-expanded", "false");
      }
    };

    function selectedOption() {
      for (var i = 0; i < options.length; i += 1) {
        if (options[i].value === current) return options[i];
      }
      return null;
    }

    function paintValue() {
      var match = selectedOption();
      valueText.textContent = match ? match.label : "All";
      paintSymbolMark(valueMark, match);
      var nodes = menu.querySelectorAll("[role='option']");
      for (var i = 0; i < nodes.length; i += 1) {
        nodes[i].setAttribute("aria-selected", nodes[i].getAttribute("data-value") === current ? "true" : "false");
      }
    }

    function choose(next) {
      control.close();
      button.focus();
      if (next === current) return;
      current = next;
      paintValue();
      listeners.forEach(function (fn) { fn(); });
    }

    function renderMenu() {
      while (menu.firstChild) menu.removeChild(menu.firstChild);
      function addOption(item) {
        var option = document.createElement("button");
        option.type = "button";
        option.className = "ocp-symbol-filter-option";
        option.setAttribute("role", "option");
        option.tabIndex = -1;
        option.setAttribute("data-value", item.value);
        var mark = document.createElement("span");
        mark.className = "ocp-symbol-filter-mark";
        paintSymbolMark(mark, item);
        var text = document.createElement("span");
        text.appendChild(document.createTextNode(item.label));
        option.appendChild(mark);
        option.appendChild(text);
        option.addEventListener("click", function (event) {
          event.stopPropagation();
          choose(item.value);
        });
        menu.appendChild(option);
      }
      addOption({ value: "", label: "All" });
      options.forEach(addOption);
      paintValue();
    }

    function optionNodes() {
      return menu.querySelectorAll("[role='option']");
    }

    function focusOption(index) {
      var nodes = optionNodes();
      if (!nodes.length) return;
      var next = index;
      if (next < 0) next = nodes.length - 1;
      if (next >= nodes.length) next = 0;
      nodes[next].focus();
    }

    function openMenu() {
      symbolSelects.forEach(function (other) {
        if (other !== control) other.close();
      });
      open = true;
      root.classList.add("is-open");
      menu.hidden = false;
      button.setAttribute("aria-expanded", "true");
      var nodes = optionNodes();
      var index = 0;
      for (var i = 0; i < nodes.length; i += 1) {
        if (nodes[i].getAttribute("data-value") === current) index = i;
      }
      if (nodes[index]) nodes[index].focus();
    }

    root.addEventListener("click", function (event) {
      if (menu.contains(event.target)) return;
      if (open) {
        control.close();
        button.focus();
        return;
      }
      openMenu();
    });

    button.addEventListener("keydown", function (event) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        if (!open) {
          openMenu();
          return;
        }
        if (event.key === "ArrowDown") focusOption(0);
        if (event.key === "ArrowUp") focusOption(-1);
        return;
      }
      if (event.key === "Escape" && open) {
        event.preventDefault();
        control.close();
      }
    });

    menu.addEventListener("keydown", function (event) {
      var nodes = optionNodes();
      var index = -1;
      for (var i = 0; i < nodes.length; i += 1) {
        if (nodes[i] === document.activeElement) index = i;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        focusOption(index + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        focusOption(index - 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        focusOption(0);
      } else if (event.key === "End") {
        event.preventDefault();
        focusOption(nodes.length - 1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        control.close();
        button.focus();
      } else if (event.key === "Tab") {
        control.close();
      }
    });

    control.isOpen = function () { return open; };
    control.focusButton = function () { button.focus(); };
    symbolSelects.push(control);
    if (symbolSelects.length === 1) {
      document.addEventListener("click", function (event) {
        symbolSelects.forEach(function (item) {
          if (!item.root.contains(event.target)) item.close();
        });
      });
      document.addEventListener("keydown", function (event) {
        if (event.key !== "Escape") return;
        var restore = null;
        symbolSelects.forEach(function (item) {
          if (item.isOpen()) restore = item;
          item.close();
        });
        if (restore) restore.focusButton();
      });
    }
    renderMenu();

    return {
      label: root,
      fill: function (next) {
        var previous = current;
        options = [];
        next.forEach(function (item) {
          if (!item || typeof item.value !== "string" || !item.value || typeof item.label !== "string") return;
          options.push(item);
        });
        var keep = previous === "";
        options.forEach(function (item) {
          if (item.value === previous) keep = true;
        });
        current = keep ? previous : "";
        renderMenu();
      },
      select: {
        get value() { return current; },
        set value(next) {
          var value = typeof next === "string" ? next : "";
          var known = value === "";
          for (var i = 0; i < options.length; i += 1) {
            if (options[i].value === value) known = true;
          }
          current = known ? value : "";
          paintValue();
        },
        addEventListener: function (type, fn) {
          if (type === "change") listeners.push(fn);
        }
      }
    };
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
    return row;
  }

  function trimmedField(value) {
    return typeof value === "string" ? value.trim() : "";
  }

  function displayedName(place) {
    var name = trimmedField(place.name);
    return name ? name : "Location";
  }

  function joinedNonEmpty(parts, separator) {
    var out = [];
    parts.forEach(function (part) {
      if (part) out.push(part);
    });
    return out.join(separator);
  }

  var NPUB = /^npub1[02-9ac-hj-np-z]{58}$/;

  // The shop page path, or null when the place has no valid npub id.
  function shopPath(place) {
    return typeof place.id === "string" && NPUB.test(place.id) ? "/" + place.id : null;
  }

  function displayedLocation(place) {
    return joinedNonEmpty([
      joinedNonEmpty([trimmedField(place.street), trimmedField(place.houseNumber)], " "),
      joinedNonEmpty([trimmedField(place.postalCode), trimmedField(place.city)], " ")
    ], ", ");
  }

  function displayedActivity(place) {
    switch (place.activity) {
      case "daily":
        return "Daily";
      case "within7Days":
        return "Weekly";
      case "within30Days":
        return "Monthly";
      case "olderThan30Days":
        return "Idle";
      default:
        return "None";
    }
  }

  function activityMarkerClass(place) {
    switch (place.activity) {
      case "daily":
        return "ocp-place-marker is-daily";
      case "within7Days":
        return "ocp-place-marker is-weekly";
      case "within30Days":
        return "ocp-place-marker is-monthly";
      case "olderThan30Days":
        return "ocp-place-marker is-idle";
      default:
        return "ocp-place-marker is-none";
    }
  }

  // A chosen activity is a minimum. Monthly keeps Weekly and Daily.
  // Idle and None stay exact.
  function activityMeets(place, selected) {
    if (!selected) return true;
    var activity = place.activity;
    if (selected === "olderThan30Days") return activity === "olderThan30Days";
    if (selected === "none") {
      return activity !== "daily" && activity !== "within7Days" && activity !== "within30Days" && activity !== "olderThan30Days";
    }
    var need = selected === "daily" ? 3 : selected === "within7Days" ? 2 : selected === "within30Days" ? 1 : 0;
    var have = activity === "daily" ? 3 : activity === "within7Days" ? 2 : activity === "within30Days" ? 1 : 0;
    return need > 0 && have >= need;
  }

  function addCell(row, text) {
    var cell = document.createElement("td");
    cell.textContent = text;
    row.appendChild(cell);
  }

  function csvField(value) {
    var text = String(value);
    var first = text.charAt(0);
    if (first === "=" || first === "+" || first === "-" || first === "@" || first === "\t" || first === "\r") {
      text = "'" + text;
    }
    if (text.indexOf(",") !== -1 || text.indexOf('"') !== -1 || text.indexOf("\r") !== -1 || text.indexOf("\n") !== -1) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }

  function bindActivityHelp() {
    var button = document.getElementById("ocp-activity-help-button");
    var panel = document.getElementById("ocp-activity-help");
    if (!button || !panel || typeof panel.showPopover !== "function") return;

    function place() {
      if (!panel.matches(":popover-open")) return;
      var rect = button.getBoundingClientRect();
      var margin = 8;
      panel.style.left = "0px";
      panel.style.top = "0px";
      var width = panel.offsetWidth;
      var height = panel.offsetHeight;
      var left = rect.left;
      if (left + width > window.innerWidth - margin) left = window.innerWidth - margin - width;
      if (left < margin) left = margin;
      var top = rect.bottom + margin;
      if (top + height > window.innerHeight - margin && rect.top - margin - height >= margin) {
        top = rect.top - margin - height;
      }
      panel.style.left = Math.round(left) + "px";
      panel.style.top = Math.round(top) + "px";
    }

    panel.addEventListener("toggle", function (event) {
      if (event.newState === "open") place();
    });
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
  }

  function exportStoresCsv() {
    var csvTable = document.getElementById("ocp-place-table");
    if (!csvTable) return;
    var tbody = csvTable.querySelector("tbody");
    if (!tbody) return;
    var bodyRows = tbody.querySelectorAll("tr");
    if (!bodyRows.length) return;
    var lines = [];
    var headerFields = [];
    csvTable.querySelectorAll("thead th").forEach(function (cell) {
      var label = cell.querySelector(".ocp-col-label");
      headerFields.push(csvField(label ? label.textContent : cell.textContent));
    });
    headerFields.push(csvField("URL"));
    lines.push(headerFields.join(","));
    bodyRows.forEach(function (row) {
      var fields = [];
      row.querySelectorAll("td").forEach(function (cell) {
        fields.push(csvField(cell.textContent));
      });
      var path = row.getAttribute("data-shop-path");
      fields.push(csvField(path ? siteOrigin + path : ""));
      lines.push(fields.join(","));
    });
    var blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
    var objectUrl = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.href = objectUrl;
    link.download = "stores.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }

  function syncStoresChrome() {
    var wrap = document.getElementById("ocp-stores-map-wrap");
    if (storesView === "table" && lastRowCount === 0) {
      if (wrap) wrap.hidden = true;
      tableWrap.hidden = true;
      if (csvButton) csvButton.hidden = true;
      if (!placesLoadFailed) setNote("No locations published yet.");
      return;
    }
    if (storesView === "table") {
      if (wrap) wrap.hidden = true;
      tableWrap.hidden = false;
      if (csvButton) csvButton.hidden = false;
      if (!placesLoadFailed) hideNote();
      return;
    }
    if (wrap) wrap.hidden = false;
    tableWrap.hidden = true;
    if (csvButton) csvButton.hidden = true;
    if (lastRowCount === 0) {
      if (!placesLoadFailed) setNote("No locations published yet.");
      return;
    }
    if (!placesLoadFailed) hideNote();
  }

  function renderRows(places) {
    var tbody = table.querySelector("tbody");
    while (tbody.firstChild) tbody.removeChild(tbody.firstChild);
    places.forEach(function (place) {
      var row = document.createElement("tr");
      var path = shopPath(place);
      if (path) {
        row.setAttribute("data-shop-path", path);
        var nameCell = document.createElement("td");
        var link = document.createElement("a");
        link.href = path;
        link.textContent = displayedName(place);
        nameCell.appendChild(link);
        row.appendChild(nameCell);
      } else {
        addCell(row, displayedName(place));
      }
      addCell(row, displayedLocation(place));
      addCell(row, trimmedField(place.country));
      var shop = trimmedField(place.shopName);
      addCell(row, shop ? shop : "Others");
      addCell(row, techProviderOf(place));
      addCell(row, displayedActivity(place));
      tbody.appendChild(row);
    });
    rowsRendered = true;
    lastRowCount = places.length;
    syncStoresChrome();
  }

  function loadPlacesUi(map) {
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
        var chainControl = makeSymbolSelect("Blockchain");
        var assetControl = makeSymbolSelect("Asset");
        var activityControl = makeSymbolSelect("Activity");
        var blockchainIcons = symbolMap(filtersBody, "blockchains");
        var assetIcons = symbolMap(filtersBody, "assets");
        fillSelect(countryControl.select, countryCodes(filtersBody));
        fillNamedSelect(nameControl.select, shopNameOptions(filtersBody));
        activityControl.fill(activityOptions(filtersBody));
        var filterControls = [techControl, countryControl, nameControl, chainControl, assetControl, activityControl];
        var filterRow = mountFilters(filterControls);

        var entries = [];
        var matched = [];
        var placesTask = null;
        var visibleMarkers = [];

        function currentQuery() {
          return {
            country: countryControl.select.value,
            shopName: nameControl.select.value,
            blockchain: chainControl.select.value,
            asset: assetControl.select.value,
            activity: activityControl.select.value
          };
        }

        function queryKey(query) {
          return query.country + "\n" + query.shopName + "\n" + query.blockchain + "\n" + query.asset + "\n" + query.activity;
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
          chainControl.fill(namedSymbolOptions(specTokens(spec, "blockchains"), blockchainIcons));
          assetControl.fill(namedSymbolOptions(assetsFor(spec, chainControl.select.value), assetIcons));
        }

        function frameVisibleMarkers() {
          if (!map) return;
          var wrap = document.getElementById("ocp-stores-map-wrap");
          if (wrap && wrap.hidden) return;
          if (visibleMarkers.length === 0) return;
          if (visibleMarkers.length === 1) {
            map.setCenter(visibleMarkers[0].getLngLat());
            map.setZoom(12);
            return;
          }
          var bounds = new maplibregl.LngLatBounds();
          visibleMarkers.forEach(function (marker) {
            bounds.extend(marker.getLngLat());
          });
          map.fitBounds(bounds, { padding: 48, maxZoom: 12 });
        }

        function applyFilter() {
          var selected = techControl.select.value;
          if (table) {
            var rows = [];
            matched.forEach(function (place) {
              if (!selected || techProviderOf(place) === selected) {
                rows.push(place);
              }
            });
            rows.sort(function (a, b) {
              return displayedName(a).localeCompare(displayedName(b));
            });
            renderRows(rows);
          }
          if (!map) return;
          visibleMarkers = [];
          entries.forEach(function (entry) {
            if (!selected || entry.provider === selected) {
              entry.marker.addTo(map);
              visibleMarkers.push(entry.marker);
            } else {
              entry.marker.remove();
            }
          });
          frameVisibleMarkers();
        }

        function mountStoresViewSwitch(row) {
          if (!map || !table || !row) return;
          var wrap = document.getElementById("ocp-stores-map-wrap");
          if (!wrap) return;
          var switchRoot = document.createElement("div");
          switchRoot.className = "ocp-view-switch";
          var pill = document.createElement("div");
          pill.className = "ocp-view-switch-pill";
          pill.setAttribute("role", "group");
          pill.setAttribute("aria-label", "View");
          var mapButton = document.createElement("button");
          mapButton.type = "button";
          mapButton.className = "ocp-view-switch-choice";
          mapButton.setAttribute("aria-pressed", "false");
          mapButton.appendChild(document.createTextNode("Map"));
          var tableButton = document.createElement("button");
          tableButton.type = "button";
          tableButton.className = "ocp-view-switch-choice";
          tableButton.setAttribute("aria-pressed", "true");
          tableButton.appendChild(document.createTextNode("Table"));
          pill.appendChild(mapButton);
          pill.appendChild(tableButton);
          switchRoot.appendChild(pill);
          row.appendChild(switchRoot);

          function resizeStoresMap() {
            if (!map || wrap.hidden) return;
            map.resize();
            frameVisibleMarkers();
          }

          function chooseView(next) {
            mapButton.setAttribute("aria-pressed", next === "map" ? "true" : "false");
            tableButton.setAttribute("aria-pressed", next === "table" ? "true" : "false");
            if (storesView === next) return;
            storesView = next;
            if (!rowsRendered) {
              wrap.hidden = next !== "map";
              tableWrap.hidden = true;
              if (csvButton) csvButton.hidden = true;
              if (next === "map") resizeStoresMap();
              return;
            }
            syncStoresChrome();
            if (next === "map") resizeStoresMap();
          }

          mapButton.addEventListener("click", function () {
            chooseView("map");
          });
          tableButton.addEventListener("click", function () {
            chooseView("table");
          });
        }

        mountStoresViewSwitch(filterRow);

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
          if (!place) return false;
          if (query.country && place.country !== query.country) return false;
          if (query.shopName === "SPAR" && place.shopName !== "SPAR") return false;
          if (query.shopName === "others" && place.shopName === "SPAR") return false;
          if (!activityMeets(place, query.activity)) return false;
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
          placesLoadFailed = false;
          var techBefore = techControl.select.value;
          var query = currentQuery();
          var queryBefore = queryKey(query);
          entries.forEach(function (entry) {
            entry.marker.remove();
          });
          entries = [];
          var kept = [];
          var providerRows = [];
          // Activity narrows the rows. The provider list stays on the other
          // filters, so a provider with no match does not fall back to All.
          var providerQuery = {
            country: query.country,
            shopName: query.shopName,
            blockchain: query.blockchain,
            asset: query.asset,
            activity: ""
          };
          places.forEach(function (place) {
            if (!placeMatchesQuery(place, providerQuery)) return;
            if (map && !table && (!finiteCoord(place.lat, -90, 90) || !finiteCoord(place.lon, -180, 180))) {
              return;
            }
            providerRows.push(place);
            if (!activityMeets(place, query.activity)) return;
            kept.push(place);
            if (!map) return;
            if (!finiteCoord(place.lat, -90, 90) || !finiteCoord(place.lon, -180, 180)) return;
            var markerEl = document.createElement("div");
            markerEl.className = activityMarkerClass(place);
            markerEl.title = displayedActivity(place);
            var popupNode = document.createElement("div");
            popupNode.className = "ocp-place-popup";
            var cover = place.coverPhoto;
            if (cover && typeof cover.url === "string" && /^https:\/\//.test(cover.url)) {
              var coverImage = document.createElement("img");
              coverImage.loading = "lazy";
              coverImage.referrerPolicy = "no-referrer";
              coverImage.alt = "";
              coverImage.src = cover.url;
              popupNode.appendChild(coverImage);
            }
            var name = document.createElement("strong");
            name.textContent = typeof place.name === "string" && place.name ? place.name : "Location";
            popupNode.appendChild(name);
            if (typeof place.category === "string" && place.category) {
              var category = document.createElement("div");
              category.textContent = place.category;
              popupNode.appendChild(category);
            }
            var detailsPath = shopPath(place);
            if (detailsPath) {
              var details = document.createElement("a");
              details.href = detailsPath;
              details.textContent = "Details →";
              details.className = "ocp-place-popup-details";
              popupNode.appendChild(details);
            }
            var marker = new maplibregl.Marker({ element: markerEl })
              .setLngLat([place.lon, place.lat])
              .setPopup(new maplibregl.Popup({ offset: 16 }).setDOMContent(popupNode));
            entries.push({ marker: marker, provider: techProviderOf(place) });
          });
          matched = kept;
          fillSelect(techControl.select, uniqueProviders(providerRows));
          if (techControl.select.value !== techBefore) syncPaymentOptions();
          applyFilter();
          if (map && !table) {
            if (entries.length === 0) {
              setNote("No locations published yet.");
            } else {
              hideNote();
            }
          }
          if (queryKey(currentQuery()) !== queryBefore) {
            loadPlaces().catch(function (error) {
              if (error && error.name === "AbortError") return;
              placesLoadFailed = true;
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
            placesLoadFailed = true;
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
        activityControl.select.addEventListener("change", reloadPlaces);
        syncPaymentOptions();
        return loadPlaces().catch(function (error) {
          if (error && error.name === "AbortError") return;
          placesLoadFailed = true;
          setNote("The place list could not be loaded.");
        });
      });
  }

  function onPlacesFailure(error) {
    if (error && error.name === "AbortError") return;
    placesLoadFailed = true;
    setNote("The place list could not be loaded.");
  }

  if (table) {
    var apiNote = document.getElementById("ocp-places-api");
    if (apiNote) {
      apiNote.hidden = false;
      var listLink = document.getElementById("ocp-places-api-list");
      listLink.href = placesUrl;
      listLink.textContent = "GET " + placesUrl;
      var filtersLink = document.getElementById("ocp-places-api-filters");
      var apiFiltersUrl = filtersUrl();
      filtersLink.href = apiFiltersUrl;
      filtersLink.textContent = "GET " + apiFiltersUrl;
    }
  }

  if (own) {
    loadCss("css/maplibre-gl.css");
    loadCss("css/ocp-places.css?v=02d050b");

    loadScript("js/maplibre-gl.js")
      .then(function () {
        var map = new maplibregl.Map({
          container: own,
          style: "https://tiles.openfreemap.org/styles/liberty",
          center: [8.23, 46.8],
          zoom: 7
        });
        map.addControl(new maplibregl.NavigationControl(), "top-right");
        return loadPlacesUi(map);
      })
      .catch(onPlacesFailure);
  } else {
    var storesMap = document.getElementById("ocp-stores-map");
    if (storesMap) {
      loadCss("css/maplibre-gl.css");
      loadScript("js/maplibre-gl.js")
        .then(function () {
          try {
            var map = new maplibregl.Map({
              container: storesMap,
              style: "https://tiles.openfreemap.org/styles/liberty",
              center: [8.23, 46.8],
              zoom: 7
            });
            map.addControl(new maplibregl.NavigationControl(), "top-right");
            return loadPlacesUi(map);
          } catch (error) {
            return loadPlacesUi(null).catch(onPlacesFailure);
          }
        })
        .catch(function () {
          return loadPlacesUi(null).catch(onPlacesFailure);
        });
    } else {
      loadPlacesUi(null).catch(onPlacesFailure);
    }
  }
})();
