/* global chrome */

const withCurrentWindow = (obj) => Object.assign({ currentWindow: true }, obj)

const queryCurrentWindow = (query = {}) => chrome.tabs.query(withCurrentWindow(query))

const toIds = (tabs) => tabs.map((tab) => tab.id)

// All tabs in the current window, the active tab, and the tabs eligible for
// closing. Positions come from tab.index, which counts pinned tabs, so the
// comparison has to happen against the full tab list rather than a filtered one.
const getWindowTabs = async (includePinned) => {
  const tabs = await queryCurrentWindow()
  const active = tabs.find((tab) => tab.active)
  const candidates = includePinned ? tabs : tabs.filter((tab) => !tab.pinned)

  return { active, candidates }
}

const tabsToTheLeft = async (includePinned) => {
  const { active, candidates } = await getWindowTabs(includePinned)
  if (!active) return []

  return toIds(candidates.filter((tab) => tab.index < active.index))
}

const tabsToTheRight = async (includePinned) => {
  const { active, candidates } = await getWindowTabs(includePinned)
  if (!active) return []

  return toIds(candidates.filter((tab) => tab.index > active.index))
}

const otherTabs = async (includePinned) => {
  const { active, candidates } = await getWindowTabs(includePinned)
  if (!active) return []

  return toIds(candidates.filter((tab) => tab.id !== active.id))
}

// Host and domain matching only make sense for web pages. Anything else
// (chrome://, about:, file://, data:, missing url) has no key and matches nothing.
const parseWebURL = (url) => {
  try {
    const urlObj = new URL(url)
    return (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') ? urlObj : null
  } catch (err) {
    return null
  }
}

const hostKey = (url) => {
  const urlObj = parseWebURL(url)
  return urlObj && `${urlObj.protocol}//${urlObj.host}`
}

const domainKey = (url) => {
  const urlObj = parseWebURL(url)
  return urlObj && `${urlObj.protocol}//${urlObj.hostname}`
}

const urlKey = (url) => url || null

// Compare keys in code instead of building a chrome.tabs.query match pattern
// from the page URL, so characters like `*` in a URL are never treated as wildcards.
const matchingTabs = async (keyFn, includeActive) => {
  const tabs = await queryCurrentWindow()
  const active = tabs.find((tab) => tab.active)
  if (!active) return []

  const key = keyFn(active.url)
  if (!key) return []

  return toIds(tabs.filter((tab) =>
    keyFn(tab.url) === key && (includeActive || tab.id !== active.id)
  ))
}

const fromQuery = (query) => async () => toIds(await queryCurrentWindow(query))

const options = [
  { id: 'pinned-tabs', title: 'Pinned Tabs', getIds: fromQuery({ pinned: true }) },
  { id: 'audible-tabs', title: 'Audible Tabs', getIds: fromQuery({ audible: true }) },
  { id: 'muted-tabs', title: 'Muted Tabs', getIds: fromQuery({ muted: true }) },
  { separator: true },
  { id: 'tabs-left', title: 'Tabs to the Left', getIds: () => tabsToTheLeft(false) },
  { id: 'tabs-right', title: 'Tabs to the Right', getIds: () => tabsToTheRight(false) },
  { id: 'other-tabs', title: 'Other Tabs', getIds: () => otherTabs(false) },
  { separator: true },
  { id: 'tabs-left-pinned', title: 'Tabs to the Left (including pinned tabs)', getIds: () => tabsToTheLeft(true) },
  { id: 'tabs-right-pinned', title: 'Tabs to the Right (including pinned tabs)', getIds: () => tabsToTheRight(true) },
  { id: 'other-tabs-pinned', title: 'Other Tabs (including pinned tabs)', getIds: () => otherTabs(true) },
  { separator: true },
  { id: 'same-host', title: 'Same Host', getIds: () => matchingTabs(hostKey, false) },
  { id: 'same-domain', title: 'Same Domain', getIds: () => matchingTabs(domainKey, false) },
  { id: 'same-url', title: 'Same URL', getIds: () => matchingTabs(urlKey, false) },
  { separator: true },
  { id: 'same-host-including', title: 'Same Host (including this tab)', getIds: () => matchingTabs(hostKey, true) },
  { id: 'same-domain-including', title: 'Same Domain (including this tab)', getIds: () => matchingTabs(domainKey, true) },
  { id: 'same-url-including', title: 'Same URL (including this tab)', getIds: () => matchingTabs(urlKey, true) },
  { separator: true },
  { id: 'highlighted-tabs', title: 'Highlighted Tabs', getIds: fromQuery({ highlighted: true }) },
  { separator: true },
  { id: 'loading-tabs', title: 'Currently Loading Tabs', getIds: fromQuery({ status: 'loading' }) },
  { id: 'loaded-tabs', title: 'Already Loaded Tabs', getIds: fromQuery({ status: 'complete' }) },
  { separator: true },
  { id: 'discarded-tabs', title: 'Discarded Tabs', getIds: fromQuery({ discarded: true }) },
  { id: 'discardable-tabs', title: 'Discardable Tabs', getIds: fromQuery({ autoDiscardable: true }) }
]

// Context menu items persist across service worker restarts, so create them
// once per install or update. Creating them on every worker start fails with
// duplicate id errors.
const createContextMenus = () => {
  chrome.contextMenus.removeAll(() => {
    let separatorCount = 0

    options.forEach((option) => {
      if (option.separator) {
        chrome.contextMenus.create({
          id: `separator-${separatorCount++}`,
          type: 'separator',
          contexts: ['page']
        })
        return
      }

      chrome.contextMenus.create({
        id: option.id,
        title: option.title,
        contexts: ['page']
      })
    })
  })
}

const handleMenuClick = async (info) => {
  const option = options.find((opt) => opt.id === info.menuItemId)
  if (!option || !option.getIds) return

  try {
    const ids = await option.getIds()
    if (ids.length > 0) {
      await chrome.tabs.remove(ids)
    }
  } catch (err) {
    console.error(`Tab Ninja: "${option.id}" failed`, err)
  }
}

chrome.runtime.onInstalled.addListener(createContextMenus)
chrome.contextMenus.onClicked.addListener(handleMenuClick)
