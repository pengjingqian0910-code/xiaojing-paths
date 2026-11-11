/* 首頁：依 data/paths.json 的順序，列出每一條學習路徑。 */
(function () {
  "use strict";
  var list = document.getElementById("cards");
  var msg = document.getElementById("msg");

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function card(data) {
    var t = Xj.totals(data);
    var st = Xj.loadState(data.slug);
    var done = 0;
    data.units.forEach(function (u, i) { if (st.checked[i]) done += u.hours; });
    var pct = Math.round(done / t.hours * 100);

    var li = el("li", "card");
    var h = el("h2");
    var a = el("a", "", data.title);
    a.href = "path.html?p=" + encodeURIComponent(data.slug);
    h.appendChild(a);
    li.appendChild(h);
    li.appendChild(el("p", "", data.goal));

    var tags = el("ul", "tags");
    [data.level, data.units.length + " 個單元", t.hours + " 小時", t.weeks + " 週"].forEach(function (s) {
      tags.appendChild(el("li", "", s));
    });
    li.appendChild(tags);

    var mini = el("div", "mini");
    mini.setAttribute("role", "progressbar");
    mini.setAttribute("aria-valuemin", "0");
    mini.setAttribute("aria-valuemax", "100");
    mini.setAttribute("aria-valuenow", pct);
    mini.setAttribute("aria-label", data.title + " 的完成進度");
    var fill = el("div");
    fill.style.width = pct + "%";
    mini.appendChild(fill);
    li.appendChild(mini);
    li.appendChild(el("p", "mini-note", "你的進度：" + pct + "%"));
    return li;
  }

  Xj.getJSON("data/paths.json")
    .then(function (idx) {
      return Promise.all(idx.paths.map(function (slug) {
        return Xj.loadPath(slug).catch(function () { return { error: slug }; });
      }));
    })
    .then(function (all) {
      msg.remove();
      all.forEach(function (d) {
        if (d.error) {
          list.appendChild(el("li", "card", "無法載入路徑：" + d.error));
        } else {
          list.appendChild(card(d));
        }
      });
    })
    .catch(function (err) {
      msg.className = "msg error";
      msg.textContent = "資料載入失敗：" + err.message + "。如果是直接用雙擊開啟檔案，請改用本機伺服器（見 README）。";
    });
})();
