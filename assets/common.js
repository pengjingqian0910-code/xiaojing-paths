/* 共用小工具：讀取路徑資料、儲存進度。首頁與路徑頁都會載入。 */
(function (root) {
  "use strict";

  var SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

  function isSlug(s) { return typeof s === "string" && SLUG_RE.test(s); }

  function getJSON(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error(url + "（HTTP " + r.status + "）");
      return r.json();
    });
  }

  function loadPath(slug) {
    if (!isSlug(slug)) return Promise.reject(new Error("路徑代號不合法"));
    return getJSON("data/paths/" + slug + ".json");
  }

  /* 瀏覽器儲存可能被停用，所有讀寫都包 try/catch；沒有儲存也要能正常使用 */
  function loadState(slug) {
    try {
      var raw = localStorage.getItem("xiaojing:" + slug);
      var s = raw ? JSON.parse(raw) : null;
      if (s && typeof s === "object") return { checked: s.checked || {}, start: s.start || "" };
    } catch (e) { /* 忽略 */ }
    return { checked: {}, start: "" };
  }

  function saveState(slug, state) {
    try { localStorage.setItem("xiaojing:" + slug, JSON.stringify(state)); } catch (e) { /* 忽略 */ }
  }

  function totals(data) {
    var days = 0, hours = 0;
    data.units.forEach(function (u) { days += u.days; hours += u.hours; });
    return { days: days, hours: hours, weeks: Math.ceil(days / 7) };
  }

  /* 只放行 http(s) 連結，避免資料檔裡出現 javascript: 之類的網址 */
  function safeUrl(u) { return /^https?:\/\//i.test(u) ? u : "#"; }

  root.Xj = { isSlug: isSlug, getJSON: getJSON, loadPath: loadPath, loadState: loadState, saveState: saveState, totals: totals, safeUrl: safeUrl };
})(window);
