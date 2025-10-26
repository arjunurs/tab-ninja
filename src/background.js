/* global chrome */

function * iterate (s, e) {
  let index = s

  while (index < e) {
    yield index++
  }
}

function * iterateExcept (s, e, except) {
  let index = s

  while (index < e) {
    if (index === except) {
      index++
      continue
    }

    yield index++
  }
}

const withCurrentWindow = (obj) => Object.assign({ currentWindow: true }, obj)

const getTabIdsFromIndexes = async (indexes) => {
  const promises = indexes.map((index) => 
    chrome.tabs.query(withCurrentWindow({ index: index }))
      .then(tabs => tabs[0].id)
  )
  
  return Promise.all(promises)
}

const getActiveTabInCurrentWindow = async () => {
  const tabs = await chrome.tabs.query(withCurrentWindow({ active: true }))
  return tabs[0]
}

const getAllTabsInCurrentWindow = async () => {
  return chrome.tabs.query(withCurrentWindow({
    pinned: false
  }))
}

const getAllTabsInCurrentWindowIncludingPinnedTabs = async () => {
  return chrome.tabs.query(withCurrentWindow({
    pinned: true
  }))
}

const getTabsWithSameHost = async (tab) => {
  const urlObj = new URL(tab.url)

  return chrome.tabs.query(withCurrentWindow({
    url: `${urlObj.protocol}//${urlObj.host}/*`
  }))
}

const getTabsWithSameDomain = async (tab) => {
  const urlObj = new URL(tab.url)

  return chrome.tabs.query(withCurrentWindow({
    url: `${urlObj.protocol}//${urlObj.hostname}/*`
  }))
}

const getTabsWithSameURL = async (tab) => {
  return chrome.tabs.query(withCurrentWindow({ url: tab.url }))
}

const options = [
  {
    id: 'pinned-tabs',
    title: 'Pinned Tabs',
    query: {
      pinned: true
    }
  },
  {
    id: 'audible-tabs',
    title: 'Audible Tabs',
    query: {
      audible: true
    }
  },
  {
    id: 'muted-tabs',
    title: 'Muted Tabs',
    query: {
      muted: true
    }
  },
  {
    separator: true
  },
  {
    id: 'tabs-left',
    title: 'Tabs to the Left',
    async getIds () {
      const tabs = await getAllTabsInCurrentWindow()
      const totalTabs = tabs.length

      if (totalTabs > 1) {
        const tab = await getActiveTabInCurrentWindow()
        return getTabIdsFromIndexes([ ...iterate(0, tab.index) ])
      }
      return []
    }
  },
  {
    id: 'tabs-right',
    title: 'Tabs to the Right',
    async getIds () {
      const tabs = await getAllTabsInCurrentWindow()
      const totalTabs = tabs.length

      if (totalTabs > 1) {
        const tab = await getActiveTabInCurrentWindow()
        return getTabIdsFromIndexes([ ...iterate(tab.index + 1, totalTabs) ])
      }
      return []
    }
  },
  {
    id: 'other-tabs',
    title: 'Other Tabs',
    async getIds () {
      const tabs = await getAllTabsInCurrentWindow()
      const totalTabs = tabs.length

      if (totalTabs > 1) {
        const tab = await getActiveTabInCurrentWindow()
        return getTabIdsFromIndexes([ ...iterateExcept(0, totalTabs, tab.index) ])
      }
      return []
    }
  },
  {
    separator: true
  },
  {
    id: 'tabs-left-pinned',
    title: 'Tabs to the Left (including pinned tabs)',
    async getIds () {
      const tabs = await getAllTabsInCurrentWindowIncludingPinnedTabs()
      const totalTabs = tabs.length

      if (totalTabs > 1) {
        const tab = await getActiveTabInCurrentWindow()
        return getTabIdsFromIndexes([ ...iterate(0, tab.index) ])
      }
      return []
    }
  },
  {
    id: 'tabs-right-pinned',
    title: 'Tabs to the Right (including pinned tabs)',
    async getIds () {
      const tabs = await getAllTabsInCurrentWindowIncludingPinnedTabs()
      const totalTabs = tabs.length

      if (totalTabs > 1) {
        const tab = await getActiveTabInCurrentWindow()
        return getTabIdsFromIndexes([ ...iterate(tab.index + 1, totalTabs) ])
      }
      return []
    }
  },
  {
    id: 'other-tabs-pinned',
    title: 'Other Tabs (including pinned tabs)',
    async getIds () {
      const tabs = await getAllTabsInCurrentWindowIncludingPinnedTabs()
      const totalTabs = tabs.length

      if (totalTabs > 1) {
        const tab = await getActiveTabInCurrentWindow()
        return getTabIdsFromIndexes([ ...iterateExcept(0, totalTabs, tab.index) ])
      }
      return []
    }
  },
  {
    separator: true
  },
  {
    id: 'same-host',
    title: 'Same Host',
    async getIds () {
      const tab = await getActiveTabInCurrentWindow()
      const tabs = await getTabsWithSameHost(tab)
      
      if (tabs) {
        const allIds = tabs.map((t) => t.id)
        return allIds.filter((id) => id !== tab.id)
      }
      return []
    }
  },
  {
    id: 'same-domain',
    title: 'Same Domain',
    async getIds () {
      const tab = await getActiveTabInCurrentWindow()
      const tabs = await getTabsWithSameDomain(tab)
      
      if (tabs) {
        const allIds = tabs.map((t) => t.id)
        return allIds.filter((id) => id !== tab.id)
      }
      return []
    }
  },
  {
    id: 'same-url',
    title: 'Same URL',
    async getIds () {
      const tab = await getActiveTabInCurrentWindow()
      const tabs = await getTabsWithSameURL(tab)
      
      if (tabs) {
        const allIds = tabs.map((t) => t.id)
        return allIds.filter((id) => id !== tab.id)
      }
      return []
    }
  },
  {
    separator: true
  },
  {
    id: 'same-host-including',
    title: 'Same Host (including this tab)',
    async getIds () {
      const tab = await getActiveTabInCurrentWindow()
      const tabs = await getTabsWithSameHost(tab)
      
      if (tabs) {
        return tabs.map((t) => t.id)
      }
      return []
    }
  },
  {
    id: 'same-domain-including',
    title: 'Same Domain (including this tab)',
    async getIds () {
      const tab = await getActiveTabInCurrentWindow()
      const tabs = await getTabsWithSameDomain(tab)
      
      if (tabs) {
        return tabs.map((t) => t.id)
      }
      return []
    }
  },
  {
    id: 'same-url-including',
    title: 'Same URL (including this tab)',
    async getIds () {
      const tab = await getActiveTabInCurrentWindow()
      const tabs = await getTabsWithSameURL(tab)
      
      if (tabs) {
        return tabs.map((t) => t.id)
      }
      return []
    }
  },
  {
    separator: true
  },
  {
    id: 'highlighted-tabs',
    title: 'Highlighted Tabs',
    query: {
      highlighted: true
    }
  },
  {
    separator: true
  },
  {
    id: 'loading-tabs',
    title: 'Currently Loading Tabs',
    query: {
      status: 'loading'
    }
  },
  {
    id: 'loaded-tabs',
    title: 'Already Loaded Tabs',
    query: {
      status: 'complete'
    }
  },
  {
    separator: true
  },
  {
    id: 'discarded-tabs',
    title: 'Discarded Tabs',
    query: {
      discarded: true
    }
  },
  {
    id: 'discardable-tabs',
    title: 'Discardable Tabs',
    query: {
      autoDiscardable: true
    }
  }
]

// Create context menus
const createContextMenus = () => {
  let separatorCount = 0
  
  options.forEach((option) => {
    if (option.separator) {
      chrome.contextMenus.create({
        id: `separator-${separatorCount++}`,
        type: 'separator',
        contexts: [ 'page' ]
      })
      return
    }

    if (option.query) {
      option.getIds = async () => {
        const tabs = await chrome.tabs.query(withCurrentWindow(option.query))
        return tabs.map((tab) => tab.id)
      }
    }

    chrome.contextMenus.create({
      id: option.id,
      title: option.title,
      contexts: [ 'page' ]
    })
  })
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info) => {
  const option = options.find(opt => opt.id === info.menuItemId)
  
  if (option && option.getIds) {
    const ids = await option.getIds()
    if (ids && ids.length > 0) {
      await chrome.tabs.remove(ids)
    }
  }
})

// Initialize context menus when service worker starts
createContextMenus()