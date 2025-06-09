/**
 * 文件服务器模拟 - 用于在纯前端环境中实现文件读写操作
 * 注意：这种方法只在用户允许的情况下才能工作，且受到浏览器安全限制
 * 在静态托管环境（如Cloudflare Pages）中，无法直接写入服务器文件系统
 */

class FileServer {
  /**
   * 保存数据到指定文件
   * @param {string} filePath - 文件路径
   * @param {Object} data - 要保存的数据对象
   * @returns {Promise<boolean>} - 保存是否成功
   */
  static async saveFile(filePath, data) {
    try {
      // 首先保存到localStorage作为主要存储方式
      localStorage.setItem(`file_data_${filePath}`, JSON.stringify(data));
      
      // 创建一个包含数据的Blob
      const content = JSON.stringify(data, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
      
      // 检测是否在静态托管环境中
      const isStaticHosting = this._isStaticHostingEnvironment();
      
      // 如果不是静态托管环境，且浏览器支持File System Access API
      if (!isStaticHosting && 'showSaveFilePicker' in window) {
        try {
          // 尝试获取之前保存的文件句柄
          let fileHandle = await this._getFileHandle(filePath);
          
          if (!fileHandle) {
            // 如果没有文件句柄，请求用户选择保存位置
            fileHandle = await window.showSaveFilePicker({
              suggestedName: filePath.split('/').pop(),
              types: [{
                description: 'JSON File',
                accept: { 'application/json': ['.json'] }
              }]
            });
            
            // 保存文件句柄以便后续使用
            await this._saveFileHandle(filePath, fileHandle);
          }
          
          // 写入文件
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
          
          console.log(`文件保存成功: ${filePath}`);
          return true;
        } catch (err) {
          console.error('文件保存失败 (File System Access API):', err);
          // 如果File System Access API失败，回退到下载方法
        }
      }
      
      // 在静态托管环境中，或者如果上面的方法失败，提供下载选项
      if (isStaticHosting || !('showSaveFilePicker' in window)) {
        // 静态托管环境中，提示用户下载文件进行备份
        const shouldDownload = confirm(`在当前环境中无法自动保存文件到服务器。\n数据已保存在浏览器本地存储中。\n是否下载 ${filePath.split('/').pop()} 文件备份？`);
        
        if (shouldDownload) {
          // 创建下载链接
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filePath.split('/').pop();
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          
          console.log(`文件下载触发: ${filePath}`);
        }
      }
      
      return true;
    } catch (error) {
      console.error('文件保存失败:', error);
      return false;
    }
  }
  
  /**
   * 从指定文件加载数据
   * @param {string} filePath - 文件路径
   * @param {Object} defaultData - 如果文件不存在或读取失败时的默认数据
   * @returns {Promise<Object>} - 加载的数据对象
   */
  static async loadFile(filePath, defaultData = {}) {
    try {
      // 首先尝试从localStorage中获取数据（这是主要存储方式）
      const localData = localStorage.getItem(`file_data_${filePath}`);
      if (localData) {
        return JSON.parse(localData);
      }
      
      // 检测是否在静态托管环境中
      const isStaticHosting = this._isStaticHostingEnvironment();
      
      // 如果不是静态托管环境，且浏览器支持File System Access API
      if (!isStaticHosting && 'showOpenFilePicker' in window) {
        try {
          // 尝试获取之前保存的文件句柄
          let fileHandle = await this._getFileHandle(filePath);
          
          if (!fileHandle) {
            // 如果没有文件句柄，请求用户选择文件
            const handles = await window.showOpenFilePicker({
              types: [{
                description: 'JSON Files',
                accept: { 'application/json': ['.json'] }
              }]
            });
            fileHandle = handles[0];
            
            // 保存文件句柄以便后续使用
            await this._saveFileHandle(filePath, fileHandle);
          }
          
          // 读取文件
          const file = await fileHandle.getFile();
          const content = await file.text();
          const data = JSON.parse(content);
          
          // 将数据缓存到localStorage
          localStorage.setItem(`file_data_${filePath}`, JSON.stringify(data));
          
          console.log(`文件加载成功: ${filePath}`);
          return data;
        } catch (err) {
          console.error('文件加载失败 (File System Access API):', err);
          // 如果File System Access API失败，回退到fetch方法
        }
      }
      
      // 在静态托管环境中，或者如果上面的方法失败，尝试使用fetch API
      try {
        // 尝试从服务器加载初始文件
        const response = await fetch(filePath);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        
        // 将数据缓存到localStorage
        localStorage.setItem(`file_data_${filePath}`, JSON.stringify(data));
        
        console.log(`文件加载成功: ${filePath}`);
        return data;
      } catch (fetchError) {
        console.error(`无法从服务器加载文件: ${filePath}`, fetchError);
        
        // 如果提供了默认数据，则使用默认数据
        if (defaultData) {
          // 将默认数据缓存到localStorage
          localStorage.setItem(`file_data_${filePath}`, JSON.stringify(defaultData));
        }
        
        return defaultData;
      }
    } catch (error) {
      console.error(`文件加载失败: ${filePath}`, error);
      
      // 如果提供了默认数据，则使用默认数据
      if (defaultData) {
        // 将默认数据缓存到localStorage
        localStorage.setItem(`file_data_${filePath}`, JSON.stringify(defaultData));
      }
      
      return defaultData;
    }
  }
  
  /**
   * 检测是否在静态托管环境中
   * @private
   * @returns {boolean} - 是否在静态托管环境中
   */
  static _isStaticHostingEnvironment() {
    // 检查是否在Cloudflare Pages或其他静态托管环境中
    // 这是一个简单的检测，可能需要根据实际情况调整
    const hostname = window.location.hostname;
    return hostname.includes('pages.dev') || // Cloudflare Pages
           hostname.includes('netlify.app') || // Netlify
           hostname.includes('github.io') || // GitHub Pages
           hostname.includes('vercel.app'); // Vercel
  }
  
  /**
   * 保存文件句柄到IndexedDB
   * @private
   * @param {string} filePath - 文件路径
   * @param {FileSystemFileHandle} fileHandle - 文件句柄
   * @returns {Promise<void>}
   */
  static async _saveFileHandle(filePath, fileHandle) {
    if (!('indexedDB' in window)) return;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('FileHandleDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('fileHandles')) {
          db.createObjectStore('fileHandles', { keyPath: 'path' });
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['fileHandles'], 'readwrite');
        const store = transaction.objectStore('fileHandles');
        
        const storeRequest = store.put({ path: filePath, handle: fileHandle });
        
        storeRequest.onsuccess = () => resolve();
        storeRequest.onerror = (error) => reject(error);
      };
      
      request.onerror = (error) => reject(error);
    });
  }
  
  /**
   * 从IndexedDB获取文件句柄
   * @private
   * @param {string} filePath - 文件路径
   * @returns {Promise<FileSystemFileHandle|null>} - 文件句柄或null
   */
  static async _getFileHandle(filePath) {
    if (!('indexedDB' in window)) return null;
    
    return new Promise((resolve) => {
      const request = indexedDB.open('FileHandleDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('fileHandles')) {
          db.createObjectStore('fileHandles', { keyPath: 'path' });
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        try {
          const transaction = db.transaction(['fileHandles'], 'readonly');
          const store = transaction.objectStore('fileHandles');
          const getRequest = store.get(filePath);
          
          getRequest.onsuccess = () => {
            if (getRequest.result) {
              resolve(getRequest.result.handle);
            } else {
              resolve(null);
            }
          };
          
          getRequest.onerror = () => resolve(null);
        } catch (error) {
          console.error('获取文件句柄失败:', error);
          resolve(null);
        }
      };
      
      request.onerror = () => resolve(null);
    });
  }
}

// 导出FileServer类
window.FileServer = FileServer; 