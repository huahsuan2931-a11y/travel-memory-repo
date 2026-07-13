# 🦖 上架 GitHub + 自動版本記錄教學
# 給不熟 git 的人：照著複製貼上指令就好

---

## 為什麼用 GitHub？

- ✅ 不用一直下載新版本
- ✅ 每次改動都有記錄，可以回到任何一版
- ✅ 免費變成網站（GitHub Pages），手機也能開
- ✅ 可以裝成 App（PWA）

---

## 第一次設定（只做一次）

### 1. 註冊 GitHub 帳號
👉 https://github.com （如果還沒有）

### 2. 建立一個新 repository
1. 右上角 ＋ → New repository
2. Repository name 填：`travel-memory`
3. 選 **Public**（GitHub Pages 免費版需要）
4. 點 Create repository

### 3. 安裝 Git（如果電腦沒有）
- Mac：打開「終端機」輸入 `git --version`，沒有的話會自動提示安裝
- Windows：下載 https://git-scm.com/download/win

### 4. 上傳檔案

打開終端機（Terminal），輸入以下指令（一行一行貼）：

```bash
# 進到你解壓縮後的資料夾（把路徑換成你的）
cd ~/Downloads/travel-memory-repo

# 初始化 git
git init

# 設定你的名字和信箱（第一次用要設定）
git config user.name "Sherry"
git config user.email "你的信箱@gmail.com"

# 加入所有檔案
git add .

# 建立第一個版本
git commit -m "初始版本 v1"

# 連到你的 GitHub repo（把網址換成你的）
git remote add origin https://github.com/你的帳號/travel-memory.git

# 上傳
git branch -M main
git push -u origin main
```

第一次 push 會要求登入 GitHub，照指示登入即可。

---

## 開啟 GitHub Pages（讓它變網站）

1. 到你的 repo 頁面 → Settings
2. 左邊選 Pages
3. Source 選 `main` branch → Save
4. 等 1 分鐘，網址會出現：
   ```
   https://你的帳號.github.io/travel-memory/
   ```
5. 用手機或電腦打開這個網址，就能用了！

---

## 之後每次改動（超簡單）

改完 index.html 後，只要三行指令：

```bash
cd ~/Downloads/travel-memory-repo

git add .
git commit -m "改了什麼的說明"
git push
```

網站會自動更新，不用重新下載任何東西。

---

## 想回到舊版本？

```bash
# 看所有版本記錄
git log --oneline

# 會顯示類似：
# a1b2c3d 改了預算功能
# e4f5g6h 初始版本 v1

# 回到某個版本（用前面的代碼）
git checkout e4f5g6h
```

---

## 更省事的方法：GitHub Desktop（圖形介面）

如果不想打指令，可以用 GitHub Desktop：
👉 https://desktop.github.com

用滑鼠點一點就能：
- 看到改了哪些地方
- 打個說明按「Commit」
- 按「Push」上傳

完全不用記指令 🦖

---

## 手機安裝成 App（PWA）

打開 GitHub Pages 網址後：
- **iPhone**：Safari → 分享 → 加入主畫面
- **Android**：Chrome → 選單 → 安裝應用程式

就會像 App 一樣出現在手機桌面 🦖

---

有問題截圖給我！
