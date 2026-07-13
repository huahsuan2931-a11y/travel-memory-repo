/**
 * Travel Memory - Google Apps Script Backend
 * 華萱的旅遊管理系統後端 API
 * 
 * 功能：
 * 1. Google Drive CRUD (trips.json, photos)
 * 2. Google Calendar 整合 (行程同步)
 * 3. 台銀匯率 API (每日更新)
 * 4. 資料驗證與加密
 */

// ==================== 全域常數 ====================

const FOLDER_NAME = 'Travel Memory';
const DATA_FOLDER = 'data';
const PHOTOS_FOLDER = 'photos';
const BACKUPS_FOLDER = 'backups';

// JSON 檔案名稱
const FILES = {
  TRIPS: 'trips.json',
  CHECKLISTS: 'checklists.json',
  MAP_FOOTPRINTS: 'map-footprints.json',
  EXCHANGE_RATES: 'exchange-rates.json'
};

// 允許的 CORS Origins
const ALLOWED_ORIGINS = [
  'https://travel-memory.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174'
];

// ==================== API Endpoints ====================

/**
 * HTTP GET 請求處理
 * 用於讀取資料
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const id = e.parameter.id;
    
    let response;
    
    switch(action) {
      case 'getTrips':
        response = getAllTrips();
        break;
      case 'getTrip':
        response = getTripById(id);
        break;
      case 'getExchangeRates':
        response = getExchangeRates();
        break;
      case 'getChecklists':
        response = getChecklists();
        break;
      case 'getPhotos':
        response = getPhotosFromFolder(id);
        break;
      case 'getCountryTrips':
        response = getCountryTrips(e.parameter.country);
        break;
      case 'getAllCountries':
        response = getAllCountries();
        break;
      case 'getCalendarEvents':
        response = getCalendarEventsForDate(e.parameter.date);
        break;
      default:
        response = { success: false, error: 'Invalid action' };
    }
    
    return createJsonResponse(response);
    
  } catch (error) {
    Logger.log('doGet Error: ' + error.message);
    return createJsonResponse({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

/**
 * HTTP POST 請求處理
 * 用於寫入/更新/刪除資料
 */
function doPost(e) {
  try {
    // 解析 POST body
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let response;
    
    switch(action) {
      case 'createTrip':
        response = createTrip(data.trip);
        break;
      case 'updateTrip':
        response = updateTrip(data.id, data.trip);
        break;
      case 'deleteTrip':
        response = deleteTrip(data.id);
        break;
      case 'updateExchangeRates':
        response = fetchAndSaveExchangeRates();
        break;
      case 'importPhotos':
        response = importPhotosFromDrive(data.folderId, data.tripId);
        break;
      case 'saveChecklists':
        response = saveChecklists(data.templates);
        break;
      default:
        response = { success: false, error: 'Invalid action' };
    }
    
    return createJsonResponse(response);
    
  } catch (error) {
    Logger.log('doPost Error: ' + error.message);
    return createJsonResponse({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
}

/**
 * 建立 JSON 回應（含 CORS headers）
 */
function createJsonResponse(data) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  
  // CORS headers
  return output;
}

// ==================== Google Drive 操作 ====================

/**
 * 初始化 Drive 資料夾結構
 * 只在第一次執行時呼叫
 */
function initializeDriveStructure() {
  try {
    // 檢查是否已存在
    const existingFolders = DriveApp.getFoldersByName(FOLDER_NAME);
    if (existingFolders.hasNext()) {
      Logger.log('Folder structure already exists');
      return { success: true, message: 'Already initialized' };
    }
    
    // 建立根資料夾
    const rootFolder = DriveApp.createFolder(FOLDER_NAME);
    const dataFolder = rootFolder.createFolder(DATA_FOLDER);
    rootFolder.createFolder(PHOTOS_FOLDER);
    rootFolder.createFolder(BACKUPS_FOLDER);
    
    // 建立初始 JSON 檔案
    const defaultChecklists = getDefaultChecklists();
    
    dataFolder.createFile(FILES.TRIPS, JSON.stringify([]));
    dataFolder.createFile(FILES.CHECKLISTS, JSON.stringify(defaultChecklists));
    dataFolder.createFile(FILES.MAP_FOOTPRINTS, JSON.stringify({}));
    dataFolder.createFile(FILES.EXCHANGE_RATES, JSON.stringify({}));
    
    Logger.log('Drive structure initialized successfully');
    return { success: true, folderId: rootFolder.getId() };
    
  } catch (error) {
    Logger.log('initializeDriveStructure Error: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 取得 Travel Memory 根資料夾
 */
function getRootFolder() {
  const folders = DriveApp.getFoldersByName(FOLDER_NAME);
  if (!folders.hasNext()) {
    throw new Error('Travel Memory folder not found. Run initializeDriveStructure first.');
  }
  return folders.next();
}

/**
 * 取得指定子資料夾
 */
function getSubFolder(folderName) {
  const rootFolder = getRootFolder();
  const folders = rootFolder.getFoldersByName(folderName);
  if (!folders.hasNext()) {
    throw new Error(`Folder ${folderName} not found`);
  }
  return folders.next();
}

/**
 * 讀取 JSON 檔案
 */
function readJsonFile(fileName) {
  const dataFolder = getSubFolder(DATA_FOLDER);
  const files = dataFolder.getFilesByName(fileName);
  
  if (!files.hasNext()) {
    throw new Error(`File ${fileName} not found`);
  }
  
  const file = files.next();
  const content = file.getBlob().getDataAsString();
  return JSON.parse(content);
}

/**
 * 寫入 JSON 檔案
 */
function writeJsonFile(fileName, data) {
  const dataFolder = getSubFolder(DATA_FOLDER);
  const files = dataFolder.getFilesByName(fileName);
  
  if (!files.hasNext()) {
    // 建立新檔案
    dataFolder.createFile(fileName, JSON.stringify(data, null, 2));
  } else {
    // 更新現有檔案
    const file = files.next();
    file.setContent(JSON.stringify(data, null, 2));
  }
  
  return true;
}

// ==================== Trip CRUD 操作 ====================

/**
 * 取得所有旅行
 */
function getAllTrips() {
  try {
    const trips = readJsonFile(FILES.TRIPS);
    return { success: true, data: trips };
  } catch (error) {
    Logger.log('getAllTrips Error: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 取得單一旅行
 */
function getTripById(id) {
  try {
    const trips = readJsonFile(FILES.TRIPS);
    const trip = trips.find(t => t.id === id);
    
    if (!trip) {
      return { success: false, error: 'Trip not found' };
    }
    
    return { success: true, data: trip };
  } catch (error) {
    Logger.log('getTripById Error: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 建立新旅行
 */
function createTrip(tripData) {
  try {
    // 驗證必要欄位
    if (!tripData.destination || !tripData.startDate) {
      return { success: false, error: 'Missing required fields' };
    }
    
    // 生成唯一 ID
    const tripId = Utilities.getUuid();
    
    // 建立旅行物件
    const newTrip = {
      id: tripId,
      destination: tripData.destination,
      startDate: tripData.startDate,
      endDate: tripData.endDate,
      status: tripData.status || 'need_to_plan', // need_to_plan, in_progress, done, wish_list
      budget: tripData.budget || {},
      checklist: tripData.checklist || [],
      links: tripData.links || [],
      photos: tripData.photos || [],
      coverPhoto: tripData.coverPhoto || null,
      mapFootprints: tripData.mapFootprints || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // 讀取現有旅行列表
    const trips = readJsonFile(FILES.TRIPS);
    trips.push(newTrip);
    
    // 寫回 Drive
    writeJsonFile(FILES.TRIPS, trips);
    
    // 同步到 Google Calendar（如果有日期）
    if (newTrip.startDate && newTrip.endDate) {
      syncToCalendar(newTrip);
    }
    
    Logger.log('Trip created: ' + tripId);
    return { success: true, data: newTrip };
    
  } catch (error) {
    Logger.log('createTrip Error: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 更新旅行
 */
function updateTrip(tripId, updateData) {
  try {
    if (!tripId) {
      return { success: false, error: 'Trip ID is required' };
    }
    
    const trips = readJsonFile(FILES.TRIPS);
    const index = trips.findIndex(t => t.id === tripId);
    
    if (index === -1) {
      return { success: false, error: 'Trip not found' };
    }
    
    // 更新旅行資料
    trips[index] = {
      ...trips[index],
      ...updateData,
      id: tripId, // 確保 ID 不被覆寫
      updatedAt: new Date().toISOString()
    };
    
    writeJsonFile(FILES.TRIPS, trips);
    
    Logger.log('Trip updated: ' + tripId);
    return { success: true, data: trips[index] };
    
  } catch (error) {
    Logger.log('updateTrip Error: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 刪除旅行
 */
function deleteTrip(tripId) {
  try {
    if (!tripId) {
      return { success: false, error: 'Trip ID is required' };
    }
    
    const trips = readJsonFile(FILES.TRIPS);
    const filteredTrips = trips.filter(t => t.id !== tripId);
    
    if (trips.length === filteredTrips.length) {
      return { success: false, error: 'Trip not found' };
    }
    
    writeJsonFile(FILES.TRIPS, filteredTrips);
    
    Logger.log('Trip deleted: ' + tripId);
    return { success: true };
    
  } catch (error) {
    Logger.log('deleteTrip Error: ' + error.message);
    return { success: false, error: error.message };
  }
}

// ==================== Google Calendar 整合 ====================

/**
 * 同步旅行到 Google Calendar
 */
function syncToCalendar(trip) {
  try {
    const calendar = CalendarApp.getDefaultCalendar();
    
    // 建立行事曆事件
    const event = calendar.createEvent(
      `✈️ ${trip.destination}`,
      new Date(trip.startDate),
      new Date(trip.endDate),
      {
        description: `Travel Memory 旅行計畫\n旅行 ID: ${trip.id}`,
        location: trip.destination
      }
    );
    
    // 設定提醒（出發前 7 天、3 天、1 天）
    event.removeAllReminders();
    event.addPopupReminder(7 * 24 * 60); // 7 天前
    event.addPopupReminder(3 * 24 * 60); // 3 天前
    event.addPopupReminder(1 * 24 * 60); // 1 天前
    
    Logger.log('Synced to Calendar: ' + trip.destination);
    return event.getId();
    
  } catch (error) {
    Logger.log('syncToCalendar Error: ' + error.message);
    return null;
  }
}

// ==================== 台銀匯率 API ====================

/**
 * 抓取並儲存台銀匯率
 * 每日自動觸發（使用 Time-driven trigger）
 */
function fetchAndSaveExchangeRates() {
  try {
    const url = 'https://rate.bot.com.tw/xrt/flcsv/0/day';
    const response = UrlFetchApp.fetch(url);
    const csvContent = response.getContentText('Big5');
    
    // 解析 CSV（格式：日期,幣別,現金買入,現金賣出,即期買入,即期賣出）
    const lines = csvContent.split('\n');
    const rates = {};
    
    for (let i = 1; i < lines.length; i++) {
      const columns = lines[i].split(',');
      if (columns.length >= 6) {
        const currency = columns[0].trim();
        const buyRate = parseFloat(columns[2]); // 現金買入
        const sellRate = parseFloat(columns[3]); // 現金賣出
        
        // 計算平均匯率
        const avgRate = (buyRate + sellRate) / 2;
        
        // 只保留常用幣別
        const commonCurrencies = ['USD', 'JPY', 'EUR', 'GBP', 'AUD', 'CAD', 
                                  'SGD', 'HKD', 'THB', 'PHP', 'VND', 'KRW'];
        
        if (commonCurrencies.includes(currency)) {
          rates[currency] = avgRate;
        }
      }
    }
    
    // 加入更新時間
    const ratesData = {
      rates: rates,
      updatedAt: new Date().toISOString()
    };
    
    // 儲存到 Drive
    writeJsonFile(FILES.EXCHANGE_RATES, ratesData);
    
    Logger.log('Exchange rates updated: ' + Object.keys(rates).length + ' currencies');
    return { success: true, data: ratesData };
    
  } catch (error) {
    Logger.log('fetchAndSaveExchangeRates Error: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 取得匯率資料
 */
function getExchangeRates() {
  try {
    const ratesData = readJsonFile(FILES.EXCHANGE_RATES);
    return { success: true, data: ratesData };
  } catch (error) {
    Logger.log('getExchangeRates Error: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 設定每日自動更新匯率的觸發器
 * 執行一次即可（會自動每日觸發）
 */
function setupDailyRateTrigger() {
  // 先刪除舊的觸發器（避免重複）
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'fetchAndSaveExchangeRates') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // 建立新觸發器：每天凌晨 1:00 執行
  ScriptApp.newTrigger('fetchAndSaveExchangeRates')
    .timeBased()
    .atHour(1)
    .everyDays(1)
    .create();
  
  Logger.log('Daily exchange rate trigger created');
}

// ==================== 照片管理 ====================

/**
 * 從 Drive 資料夾匯入照片
 */
function importPhotosFromDrive(folderId, tripId) {
  try {
    if (!folderId) {
      return { success: false, error: 'Folder ID is required' };
    }
    
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFiles();
    const photos = [];
    
    while (files.hasNext()) {
      const file = files.next();
      const mimeType = file.getMimeType();
      
      // 只處理圖片檔案
      if (mimeType.startsWith('image/')) {
        photos.push({
          id: file.getId(),
          name: file.getName(),
          url: file.getUrl(),
          thumbnailUrl: file.getThumbnailLink(),
          mimeType: mimeType,
          size: file.getSize(),
          createdAt: file.getDateCreated().toISOString()
        });
      }
    }
    
    // 如果有 tripId，將照片關聯到該旅行
    if (tripId) {
      const trips = readJsonFile(FILES.TRIPS);
      const index = trips.findIndex(t => t.id === tripId);
      
      if (index !== -1) {
        trips[index].photos = photos;
        trips[index].updatedAt = new Date().toISOString();
        writeJsonFile(FILES.TRIPS, trips);
      }
    }
    
    Logger.log('Imported photos: ' + photos.length);
    return { success: true, data: photos };
    
  } catch (error) {
    Logger.log('importPhotosFromDrive Error: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 取得資料夾內的照片列表
 */
function getPhotosFromFolder(folderId) {
  try {
    if (!folderId) {
      return { success: false, error: 'Folder ID is required' };
    }
    
    return importPhotosFromDrive(folderId, null);
    
  } catch (error) {
    Logger.log('getPhotosFromFolder Error: ' + error.message);
    return { success: false, error: error.message };
  }
}

// ==================== Checklist 模板 ====================

/**
 * 取得 Checklist 模板
 */
function getChecklists() {
  try {
    const checklists = readJsonFile(FILES.CHECKLISTS);
    return { success: true, data: checklists };
  } catch (error) {
    Logger.log('getChecklists Error: ' + error.message);
    return { success: false, error: error.message };
  }
}


/**
 * 儲存使用者自訂的 Checklist 模板
 */
function saveChecklists(templates) {
  try {
    if (!templates || typeof templates !== "object") {
      return { success: false, error: "Invalid templates data" };
    }
    writeJsonFile(FILES.CHECKLISTS, templates);
    Logger.log("Checklists saved");
    return { success: true };
  } catch (error) {
    Logger.log("saveChecklists Error: " + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 預設 Checklist 模板
 */
function getDefaultChecklists() {
  return {
    'solo_travel': [
      { id: '1', text: '護照（有效期 > 6 個月）', checked: false },
      { id: '2', text: '簽證（如需要）', checked: false },
      { id: '3', text: '機票確認信', checked: false },
      { id: '4', text: '住宿確認信', checked: false },
      { id: '5', text: '旅遊保險', checked: false },
      { id: '6', text: 'SIM 卡 / eSIM', checked: false },
      { id: '7', text: '信用卡 × 2', checked: false },
      { id: '8', text: '現金（當地貨幣）', checked: false },
      { id: '9', text: '充電器 + 轉接頭', checked: false },
      { id: '10', text: '常用藥品', checked: false },
      { id: '11', text: '防曬用品', checked: false },
      { id: '12', text: '盥洗用品', checked: false }
    ],
    'hiking': [
      { id: '1', text: '登山許可證', checked: false },
      { id: '2', text: '登山背包', checked: false },
      { id: '3', text: '登山鞋', checked: false },
      { id: '4', text: '登山杖', checked: false },
      { id: '5', text: '頭燈 + 備用電池', checked: false },
      { id: '6', text: '睡袋 + 睡墊', checked: false },
      { id: '7', text: '防水外套 + 保暖衣物', checked: false },
      { id: '8', text: '行動糧 + 水', checked: false },
      { id: '9', text: '急救包', checked: false },
      { id: '10', text: '防曬 + 防蚊液', checked: false },
      { id: '11', text: '地圖 + GPS', checked: false },
      { id: '12', text: '環保袋（垃圾不留山）', checked: false }
    ]
  };
}

// ==================== 工具函數 ====================

/**
 * 驗證日期格式（ISO 8601）
 */
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * 備份資料到 backups 資料夾
 * 可手動執行或設定定期觸發
 */
/**
 * 取得指定國家的所有旅行（供世界地圖使用）
 */
function getCountryTrips(country) {
  try {
    if (!country) return { success: false, error: 'Country required' };
    const trips = readJsonFile(FILES.TRIPS);
    const matched = trips.filter(t => {
      const c = (t.country || '').toLowerCase();
      const title = (t.title || '').toLowerCase();
      const q = country.toLowerCase();
      return c === q || c.includes(q) || q.includes(c) || title.includes(q);
    });
    return { success: true, data: matched };
  } catch (error) {
    Logger.log('getCountryTrips Error: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 取得所有有旅行記錄的國家列表（供世界地圖標記用）
 */
function getAllCountries() {
  try {
    const trips = readJsonFile(FILES.TRIPS);
    const countryMap = {};
    trips.forEach(t => {
      if (!t.country) return;
      const c = t.country;
      if (!countryMap[c]) countryMap[c] = [];
      countryMap[c].push({
        id: t.id,
        title: t.title,
        status: t.status,
        dates: t.dates,
        emoji: t.emoji || '✈️'
      });
    });
    return { success: true, data: countryMap };
  } catch (error) {
    Logger.log('getAllCountries Error: ' + error.message);
    return { success: false, error: error.message };
  }
}

/**
 * 取得指定日期的 Google Calendar 事件
 */
function getCalendarEventsForDate(dateStr) {
  try {
    if (!dateStr) return { success: false, error: 'Date required' };
    const date = new Date(dateStr);
    const endDate = new Date(dateStr);
    endDate.setDate(endDate.getDate() + 1);
    const calendar = CalendarApp.getDefaultCalendar();
    const events = calendar.getEvents(date, endDate);
    const result = events.map(ev => ({
      title: ev.getTitle(),
      time: Utilities.formatDate(ev.getStartTime(), 'GMT+8', 'HH:mm'),
      location: ev.getLocation() || ''
    }));
    return { success: true, data: result };
  } catch (error) {
    Logger.log('getCalendarEventsForDate Error: ' + error.message);
    return { success: false, error: error.message };
  }
}

function backupData() {
  try {
    const trips = readJsonFile(FILES.TRIPS);
    const backupsFolder = getSubFolder(BACKUPS_FOLDER);
    
    const today = Utilities.formatDate(new Date(), 'GMT+8', 'yyyyMMdd');
    const backupFileName = `trips_backup_${today}.json`;
    
    backupsFolder.createFile(backupFileName, JSON.stringify(trips, null, 2));
    
    Logger.log('Backup created: ' + backupFileName);
    return { success: true, fileName: backupFileName };
    
  } catch (error) {
    Logger.log('backupData Error: ' + error.message);
    return { success: false, error: error.message };
  }
}
