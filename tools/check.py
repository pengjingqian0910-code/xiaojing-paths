#!/usr/bin/env python3
"""檢查 data/ 底下的路徑資料是否符合 CLAUDE.md 的規則。

用法：
    python tools/check.py            # 檢查格式（離線，只看資料本身）
    python tools/check.py --online   # 另外實際連線，確認每個連結能開啟

有錯誤時結束碼為 1，AI 新增或修改路徑後必須跑到 0 才算完成。
"""
import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
LEVELS = {"入門", "進階"}
errors = []


def err(where, msg):
    errors.append(f"{where}: {msg}")


def load(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:  # noqa: BLE001
        err(path.relative_to(ROOT), f"不是合法的 JSON（{e}）")
        return None


def check_path(slug, data, urls):
    w = f"data/paths/{slug}.json"
    if data.get("slug") != slug:
        err(w, f'"slug" 必須和檔名相同（{slug}）')
    for key in ("title", "goal", "level", "updated"):
        if not isinstance(data.get(key), str) or not data[key].strip():
            err(w, f'缺少或為空："{key}"')
    if data.get("level") not in LEVELS:
        err(w, f'"level" 只能是 {sorted(LEVELS)}')
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", str(data.get("updated", ""))):
        err(w, '"updated" 格式要是 YYYY-MM-DD')

    units = data.get("units")
    if not isinstance(units, list) or not 3 <= len(units) <= 12:
        err(w, '"units" 必須是 3 到 12 個單元')
        return
    for i, u in enumerate(units, 1):
        uw = f"{w} 單元{i}"
        if not isinstance(u.get("name"), str) or not u["name"].strip():
            err(uw, "缺少 name")
        if not isinstance(u.get("note"), str) or not u["note"].strip():
            err(uw, "缺少 note")
        h, d = u.get("hours"), u.get("days")
        if not isinstance(h, (int, float)) or h <= 0:
            err(uw, "hours 必須是大於 0 的數字")
        if not isinstance(d, int) or d <= 0:
            err(uw, "days 必須是正整數")
        if isinstance(h, (int, float)) and isinstance(d, int) and d > 0 and h / d > 3:
            err(uw, f"每天要讀 {h / d:.1f} 小時，超過 3 小時，時程不實際")
        links = u.get("links")
        if not isinstance(links, list) or not links:
            err(uw, "每個單元至少要有 1 個連結")
            continue
        for l in links:
            if not isinstance(l.get("title"), str) or not l["title"].strip():
                err(uw, "連結缺少 title")
            url = l.get("url", "")
            if not re.match(r"^https://", url):
                err(uw, f"連結必須是 https：{url!r}")
            else:
                urls.add(url)


def check_online(urls):
    for url in sorted(urls):
        req = urllib.request.Request(url, headers={"User-Agent": "xiaojing-link-check"})
        try:
            with urllib.request.urlopen(req, timeout=15) as r:
                if r.status >= 400:
                    err("連結", f"{url} 回應 {r.status}")
        except Exception as e:  # noqa: BLE001
            err("連結", f"{url} 打不開（{e}）")


def main():
    online = "--online" in sys.argv
    idx = load(ROOT / "data" / "paths.json")
    listed = idx.get("paths", []) if idx else []
    files = {p.stem for p in (ROOT / "data" / "paths").glob("*.json")}

    for s in listed:
        if not SLUG_RE.match(s):
            err("data/paths.json", f"代號不合法：{s}")
    for s in files - set(listed):
        err("data/paths.json", f"{s}.json 存在，但沒有登記在 paths.json")
    for s in set(listed) - files:
        err("data/paths.json", f"登記了 {s}，但 data/paths/{s}.json 不存在")
    if len(listed) != len(set(listed)):
        err("data/paths.json", "有重複的代號")

    urls = set()
    for s in listed:
        p = ROOT / "data" / "paths" / f"{s}.json"
        if p.exists():
            data = load(p)
            if data:
                check_path(s, data, urls)

    if online and not errors:
        check_online(urls)

    if errors:
        print(f"發現 {len(errors)} 個問題：")
        for e in errors:
            print("  -", e)
        return 1
    print(f"OK：{len(listed)} 條路徑、{len(urls)} 個連結" + ("（已連線確認）" if online else "（未連線，連結需另外人工確認）"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
