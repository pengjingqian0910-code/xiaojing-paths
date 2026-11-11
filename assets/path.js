/* 路徑頁：讀 ?p=<slug> 對應的 data/paths/<slug>.json，畫出清單、進度、路線圖與甘特圖。 */
(function () {
  "use strict";

  var slug = new URLSearchParams(location.search).get("p") || "";
  var UNITS = [], TOTAL_DAYS = 0, TOTAL_HOURS = 0, WEEKS = 0, PLANNED_PER_DAY = 0;
  var state = { checked: {}, start: "" };
  var simDay = 0;

  function $(id) { return document.getElementById(id); }
  function pad(n) { return n < 10 ? "0" + n : "" + n; }
  function toInputValue(dt) { return dt.getFullYear() + "-" + pad(dt.getMonth() + 1) + "-" + pad(dt.getDate()); }
  function parseDate(s) { var p = s.split("-").map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(dt, n) { var x = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate()); x.setDate(x.getDate() + n); return x; }
  function fmt(dt) { return (dt.getMonth() + 1) + "/" + dt.getDate(); }
  function diffDays(a, b) { return Math.round((a - b) / 86400000); }
  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
  function startDate() { return state.start ? parseDate(state.start) : parseDate(toInputValue(new Date())); }
  function save() { Xj.saveState(slug, state); }

  function statusOf(u, d) {
    if (state.checked[u.id]) return "done";
    if (d >= u.end) return "late";
    if (d >= u.start) return "doing";
    return "todo";
  }
  function lateDaysOf(u, d) { return d - u.end + 1; }

  function fail(msg) {
    var m = $("msg");
    m.className = "msg error";
    m.textContent = msg;
    m.hidden = false;
    $("content").hidden = true;
  }

  /* ---------- 建立畫面（只做一次） ---------- */
  function buildList() {
    var ol = $("units");
    UNITS.forEach(function (u) {
      var li = document.createElement("li");
      li.className = "unit todo";
      li.id = "unit-" + u.id;

      var label = document.createElement("label");
      label.className = "check";
      var cb = document.createElement("input");
      cb.type = "checkbox";
      cb.addEventListener("change", function () {
        if (cb.checked) state.checked[u.id] = true; else delete state.checked[u.id];
        save();
        render();
      });
      var nm = document.createElement("span");
      nm.className = "uname";
      nm.textContent = "單元 " + (u.id + 1) + "　" + u.name;
      label.appendChild(cb);
      label.appendChild(nm);
      li.appendChild(label);

      var meta = document.createElement("div");
      meta.className = "umeta";
      var dates = document.createElement("span"); dates.className = "dates";
      var hrs = document.createElement("span"); hrs.textContent = "預估 " + u.hours + " 小時";
      var badge = document.createElement("span"); badge.className = "badge";
      meta.appendChild(dates); meta.appendChild(hrs); meta.appendChild(badge);
      li.appendChild(meta);

      var note = document.createElement("p");
      note.className = "unote";
      note.textContent = u.note;
      li.appendChild(note);

      var res = document.createElement("p");
      res.className = "ures";
      u.links.forEach(function (l) {
        var a = document.createElement("a");
        a.href = Xj.safeUrl(l.url);
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = l.title;
        res.appendChild(a);
      });
      li.appendChild(res);
      ol.appendChild(li);
    });
  }

  function buildGantt() {
    var g = $("gantt");
    g.style.setProperty("--weeks", WEEKS);

    var head = document.createElement("div");
    head.className = "g-row g-head";
    var hl = document.createElement("div"); hl.className = "g-label";
    var ht = document.createElement("div"); ht.className = "g-track";
    for (var w = 1; w <= WEEKS; w++) {
      var s = document.createElement("div");
      s.className = "wk";
      s.textContent = "第 " + w + " 週";
      ht.appendChild(s);
    }
    head.appendChild(hl); head.appendChild(ht);
    g.appendChild(head);

    UNITS.forEach(function (u) {
      var row = document.createElement("div");
      row.className = "g-row";
      var lab = document.createElement("div");
      lab.className = "g-label";
      lab.textContent = "單元 " + (u.id + 1) + "　" + u.name;
      var tr = document.createElement("div");
      tr.className = "g-track";
      var bar = document.createElement("div");
      bar.className = "g-bar";
      bar.id = "gbar-" + u.id;
      /* 甘特圖的總寬度是「週數 × 7 天」，所以用它而不是 TOTAL_DAYS 來換算位置 */
      bar.style.left = (u.start / (WEEKS * 7) * 100) + "%";
      bar.style.width = (u.days / (WEEKS * 7) * 100) + "%";
      tr.appendChild(bar);
      row.appendChild(lab);
      row.appendChild(tr);
      g.appendChild(row);
    });

    var today = document.createElement("div");
    today.className = "g-today";
    today.id = "gToday";
    var span = document.createElement("span");
    span.textContent = "今天";
    today.appendChild(span);
    g.appendChild(today);
  }

  /* ---------- 每次狀態改變時重畫 ---------- */
  function drawTrail(statuses, d) {
    var path = $("trailPath");
    var group = $("trailDots");
    var NS = "http://www.w3.org/2000/svg";
    while (group.firstChild) group.removeChild(group.firstChild);
    var L = path.getTotalLength();

    UNITS.forEach(function (u) {
      var p = path.getPointAtLength(L * (u.hEnd / TOTAL_HOURS));
      var c = document.createElementNS(NS, "circle");
      c.setAttribute("class", "dot " + statuses[u.id]);
      c.setAttribute("cx", p.x); c.setAttribute("cy", p.y); c.setAttribute("r", 10);
      var t = document.createElementNS(NS, "title");
      t.textContent = "單元 " + (u.id + 1) + "：" + u.name;
      c.appendChild(t);
      group.appendChild(c);
    });

    var q = path.getPointAtLength(L * clamp(d / TOTAL_DAYS, 0, 1));
    var line = document.createElementNS(NS, "line");
    line.setAttribute("class", "pin");
    line.setAttribute("x1", q.x); line.setAttribute("x2", q.x);
    line.setAttribute("y1", q.y); line.setAttribute("y2", q.y - 30);
    line.setAttribute("stroke-width", 3);
    var tri = document.createElementNS(NS, "polygon");
    tri.setAttribute("class", "pin");
    tri.setAttribute("points", (q.x - 9) + "," + (q.y - 48) + " " + (q.x + 9) + "," + (q.y - 48) + " " + q.x + "," + (q.y - 30));
    group.appendChild(line);
    group.appendChild(tri);
  }

  function render() {
    var start = startDate();
    var d = simDay;
    var statuses = UNITS.map(function (u) { return statusOf(u, d); });

    $("simLabel").textContent = "模擬今天：第 " + (d + 1) + " 天（" + fmt(addDays(start, d)) + "）";
    $("simSlider").value = d;

    var doneHours = 0, doneCount = 0, remainingHours = 0;
    var lateUnits = [], doingUnits = [];
    UNITS.forEach(function (u) {
      var st = statuses[u.id];
      var li = $("unit-" + u.id);
      li.className = "unit " + st;
      li.querySelector("input").checked = !!state.checked[u.id];
      li.querySelector(".dates").textContent = fmt(addDays(start, u.start)) + " – " + fmt(addDays(start, u.end - 1));
      var badge = li.querySelector(".badge");
      if (st === "done") badge.textContent = "已完成";
      else if (st === "late") badge.textContent = "落後 " + lateDaysOf(u, d) + " 天";
      else if (st === "doing") badge.textContent = "進行中";
      else badge.textContent = "";

      if (st === "done") { doneHours += u.hours; doneCount++; } else remainingHours += u.hours;
      if (st === "late") lateUnits.push(u);
      if (st === "doing") doingUnits.push(u);

      var gb = $("gbar-" + u.id);
      gb.className = "g-bar " + st;
      gb.textContent = st === "done" ? "✓ 完成" : st === "late" ? "落後" + lateDaysOf(u, d) + "天" : st === "doing" ? "進行中" : u.hours + "h";
      gb.title = "單元 " + (u.id + 1) + "：" + u.name + "（" + fmt(addDays(start, u.start)) + " – " + fmt(addDays(start, u.end - 1)) + "）";
    });

    $("gToday").style.left = "calc(190px + (100% - 190px - 12px) * " + (clamp(d, 0, WEEKS * 7) / (WEEKS * 7)) + ")";

    var pct = Math.round(doneHours / TOTAL_HOURS * 100);
    var expHours = 0;
    UNITS.forEach(function (u) { expHours += u.hours * clamp((d - u.start) / u.days, 0, 1); });
    var expPct = Math.round(expHours / TOTAL_HOURS * 100);
    $("pctNum").textContent = pct;
    $("fill").style.width = pct + "%";
    $("tick").style.left = expPct + "%";
    $("expPct").textContent = expPct;
    $("bar").setAttribute("aria-valuenow", pct);
    $("counts").textContent = "已完成 " + doneCount + " / " + UNITS.length + " 個單元，" + doneHours + " / " + TOTAL_HOURS + " 小時。";

    var box = $("status");
    var head, advice, load = "";
    var remDays = Math.max(TOTAL_DAYS - d, 0);
    var lastUnit = UNITS[UNITS.length - 1];

    if (doneCount === UNITS.length) {
      box.className = "status done";
      head = "全部完成，" + WEEKS + " 週的路徑走完了";
      advice = "可以回頭複習比較不熟的單元，或開始規劃下一個主題。";
    } else {
      load = remDays > 0
        ? "剩下 " + remainingHours + " 小時，距離原訂結束還有 " + remDays + " 天，平均每天約 " + (remainingHours / remDays).toFixed(1) + " 小時（原計畫約 " + PLANNED_PER_DAY.toFixed(1) + " 小時）。"
        : "原訂的 " + WEEKS + " 週已經結束，還有 " + remainingHours + " 小時的內容沒完成。";

      if (lateUnits.length === 0) {
        box.className = "status";
        head = "進度正常";
        if (doingUnits.length) {
          advice = "目前進行：單元 " + doingUnits.map(function (u) { return (u.id + 1) + "「" + u.name + "」"; }).join("、") + "。照這個節奏繼續就可以。";
        } else {
          var next = UNITS.filter(function (u) { return !state.checked[u.id]; })[0];
          advice = "你已經超前進度，下一個是單元 " + (next.id + 1) + "「" + next.name + "」，可以提早開始。";
        }
      } else {
        var maxLate = 0;
        lateUnits.forEach(function (u) { maxLate = Math.max(maxLate, lateDaysOf(u, d)); });
        head = "目前落後 " + maxLate + " 天（" + lateUnits.map(function (u) { return "單元 " + (u.id + 1); }).join("、") + " 尚未完成）";
        var first = lateUnits[0];
        if (maxLate <= 2) {
          box.className = "status warn";
          advice = "落後不多。今天挑 30 到 60 分鐘先補完「" + first.name + "」，後面的單元不用調整。";
        } else if (maxLate <= 6) {
          box.className = "status late";
          advice = "已經落後 " + maxLate + " 天。建議先補完「" + first.name + "」，並把後面單元的練習題減半，把時間追回來。";
        } else {
          box.className = "status late";
          advice = "落後超過一週。建議把整份計畫的結束日延後一週，並縮小最後單元「" + lastUnit.name + "」的範圍。";
        }
      }
    }
    $("statusHead").textContent = head;
    $("statusAdvice").textContent = advice;
    $("statusLoad").textContent = load;

    drawTrail(statuses, d);
  }

  /* ---------- 啟動 ---------- */
  function start(data) {
    document.title = "小徑｜" + data.title;
    $("title").textContent = data.title;
    $("goal").textContent = data.goal;

    data.units.forEach(function (u, i) {
      u.id = i;
      u.start = TOTAL_DAYS; TOTAL_DAYS += u.days; u.end = TOTAL_DAYS;
      TOTAL_HOURS += u.hours; u.hEnd = TOTAL_HOURS;
    });
    UNITS = data.units;
    WEEKS = Math.ceil(TOTAL_DAYS / 7);
    PLANNED_PER_DAY = TOTAL_HOURS / TOTAL_DAYS;

    state = Xj.loadState(slug);
    if (!state.start) state.start = toInputValue(new Date());
    $("startDate").value = state.start;
    $("simSlider").max = WEEKS * 7 + 6;

    buildList();
    buildGantt();

    $("startDate").addEventListener("change", function () {
      state.start = $("startDate").value || toInputValue(new Date());
      $("startDate").value = state.start;
      save();
      render();
    });
    $("simSlider").addEventListener("input", function (e) {
      simDay = parseInt(e.target.value, 10) || 0;
      render();
    });
    $("resetBtn").addEventListener("click", function () {
      simDay = clamp(diffDays(parseDate(toInputValue(new Date())), startDate()), 0, WEEKS * 7 + 6);
      render();
    });

    $("msg").hidden = true;
    $("content").hidden = false;
    render();
  }

  if (!Xj.isSlug(slug)) {
    fail("網址缺少路徑代號。請從首頁選一條路徑。");
  } else {
    Xj.loadPath(slug).then(start).catch(function (err) {
      fail("找不到這條路徑，或資料載入失敗：" + err.message);
    });
  }
})();
