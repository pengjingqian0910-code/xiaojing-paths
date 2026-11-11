# 小徑路徑集

用免費公開的網路資源，排好目標與時程、可以勾選進度的自學路徑。這是「小徑」（幫自學者規劃資源與進度的 AI）的展示版。

- 網頁：[https://pengjingqian0910-code.github.io/xiaojing-paths/](https://pengjingqian0910-code.github.io/xiaojing-paths/)
- 專案規則：[CLAUDE.md](CLAUDE.md)（給 AI 讀的開發規則）

## 目前的路徑

- 8 週學會 Python 基礎
- 4 週學會 Git 與 GitHub 基礎

## 新增一條路徑

不需要改程式。新增 `data/paths/<slug>.json`，在 `data/paths.json` 登記，然後執行檢查：

```bash
python tools/check.py
```

格式與規則都寫在 [CLAUDE.md](CLAUDE.md)。你也可以直接對 AI 說：「照 CLAUDE.md，新增一條 XXX 的學習路徑」。

## 本機預覽

網頁用 `fetch` 讀資料，需要用伺服器開啟：

```bash
python -m http.server 8000
```

打開 http://localhost:8000 。

