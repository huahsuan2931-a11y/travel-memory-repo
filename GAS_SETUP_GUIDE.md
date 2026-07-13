# 🦖 Travel Memory × GAS 串接教學
# 完全不懂程式也可以照做

---

## 你需要做的事情只有兩步：

```
步驟一：把程式碼貼到 Google
步驟二：複製一個網址，貼回 HTML 檔案
```

---

## 步驟一：把程式碼貼到 Google（約 10 分鐘）

### 1-1 打開 Google Apps Script

用你的 Google 帳號打開這個網址：
👉 https://script.google.com

右上角點「新增專案」

### 1-2 貼上程式碼

你會看到一個空白的編輯器，裡面有這段文字：
```
function myFunction() {

}
```

**全選刪掉**，然後把 `gas-backend/Code.gs` 裡面的內容全部複製貼上進去。

（Code.gs 在你下載的壓縮檔裡面）

### 1-3 存檔

按 Ctrl+S（Mac 是 Cmd+S），儲存專案。
專案名稱可以改成「Travel Memory API」。

### 1-4 初始化你的 Google Drive 資料夾

在畫面上方的函數選單（寫著 myFunction 的那個下拉）：
- 點下拉 → 選 **initializeDriveStructure**
- 點左邊的「▶ 執行」按鈕

第一次會跳出授權視窗：
1. 點「審查權限」
2. 選你的 Google 帳號
3. 看到「這個應用程式未經 Google 驗證」→ 點「進階」
4. 點「前往 Travel Memory API（不安全）」
5. 點「允許」

✅ 成功後你的 Google Drive 會出現一個叫 `Travel Memory` 的資料夾

### 1-5 更新每日匯率

同樣的方式，選 **fetchAndSaveExchangeRates** → 執行
這會抓今天台銀的匯率進來

### 1-6 設定每日自動更新匯率

選 **setupDailyRateTrigger** → 執行
（只需要跑一次，之後每天凌晨 1 點自動更新）

### 1-7 部署成「網址」

這是最重要的一步：

1. 點右上角的「**部署**」按鈕
2. 選「**新增部署作業**」
3. 點齒輪圖示 → 選「**Web 應用程式**」
4. 設定如下：
   - 說明：`v1`
   - 執行身分：**我**
   - 存取權：**任何人**  ← 這個很重要！
5. 點「**部署**」
6. 出現一串網址，長這樣：
   ```
   https://script.google.com/macros/s/AKfycby.../exec
   ```
7. **複製這個網址**（全部，包含 exec 結尾）

---

## 步驟二：把網址貼回 HTML（約 1 分鐘）

### 2-1 用文字編輯器打開 HTML

用記事本（Windows）或 TextEdit（Mac）打開 `travel-memory-FINAL.html`。

Mac 的 TextEdit 要先改成純文字模式：
格式 → 製作純文字格式

### 2-2 找到這一行

按 Ctrl+F（Mac 是 Cmd+F）搜尋：
```
const GAS_URL = '';
```

### 2-3 改成你的網址

把單引號裡面填入你剛才複製的網址：

**改之前：**
```javascript
const GAS_URL = '';
```

**改之後（舉例）：**
```javascript
const GAS_URL = 'https://script.google.com/macros/s/AKfycby你的ID/exec';
```

注意：網址要放在單引號 `' '` 裡面

### 2-4 儲存檔案

Ctrl+S 存檔，重新用瀏覽器打開 HTML 檔案。

---

## ✅ 完成！怎麼確認成功？

打開 HTML 後，右下角如果出現：
> 「已從雲端載入 🦖」

就代表串接成功了！

之後你新增的旅行、checklist、花費，都會自動存進 Google Drive。

---

## ❌ 如果出現錯誤

**問題：顯示「示範模式：GAS 未設定」**
→ 網址沒有貼進去，或貼錯位置。重新做步驟二。

**問題：顯示「無法連接 GAS，使用離線快取」**
→ 部署時「存取權」沒有設成「任何人」。
→ 回去 GAS → 部署 → 管理部署作業 → 編輯 → 改存取權 → 重新部署

**問題：授權視窗跳出來但不知道怎麼辦**
→ 照上面 1-4 的步驟做，一定要點到「允許」才算完成

---

遇到問題截圖給我，我幫你解決 🦖
