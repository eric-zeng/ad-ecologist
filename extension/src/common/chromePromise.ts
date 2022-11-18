// Promise wrappers from Chrome extension APIs.

export const windows = {
  get: function (windowId: number) {
    return new Promise<chrome.windows.Window>((resolve, reject) => {
      chrome.windows.get(windowId, (window) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(window);
        }
      });
    })
  }
}

export const tabs = {
  captureVisibleTab: function(windowId: number) {
    return new Promise<string>((resolve, reject) => {
      chrome.tabs.captureVisibleTab(windowId, (dataUrl: string) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(dataUrl);
        }
      });
    });
  },

  create: function(createProperties: chrome.tabs.CreateProperties) {
    return new Promise<chrome.tabs.Tab>((resolve, reject) => {
      chrome.tabs.create(createProperties, (tab) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(tab);
        }
      });
    });
  },

  get: function(tabId: number) {
    return new Promise<chrome.tabs.Tab>((resolve, reject) => {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(tab);
        }
      });
    });
  },

  update: function(tabId: number, options: chrome.tabs.UpdateProperties) {
    return new Promise<void>((resolve, reject) => {
      chrome.tabs.update(tabId, options, () => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }
}

export const storage = {
  local: {
    get: function(keys: string | Object | string[] | null) {
      return new Promise<{[key: string]: any}>((resolve, reject) => {
        chrome.storage.local.get(keys, (items) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(items);
          }
        });
      });
    },
    set: function(items: Object) {
      return new Promise<void>((resolve, reject) => {
        chrome.storage.local.set(items, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    },
    remove: function(keys: string | string[]) {
      return new Promise<void>((resolve, reject) => {
        chrome.storage.local.remove(keys, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve();
          }
        });
      });
    },
    getBytesInUse: function(keys: string | string[]) {
      return new Promise<number>((resolve, reject) => {
        chrome.storage.local.getBytesInUse(keys, (bytes: number) => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            resolve(bytes);
          }
        });
      });
    }
  }
}

