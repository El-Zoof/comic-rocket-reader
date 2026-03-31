/* global chrome */

import { FETCH_COMICS, LOGIN_CHECK } from '../../app/api/Paths'
import { countUnreadPages } from '../../app/utils/ComicsUtil'

const defaultStorage = {
  comics: [],
  backlog: []
}

const checkLogin = () => {
  fetch(LOGIN_CHECK, { credentials: 'include' })
    .then(response => {
      if (response.ok || response.status === 202) {
        chrome.storage.local.get('comicRocketReader', storage => {
          const comicRocketReader = storage.comicRocketReader || defaultStorage
          comicRocketReader.isLoggedIn = true
          comicRocketReader.lastError = null
          updateComics(comicRocketReader)
        })
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    })
    .catch(err => {
      chrome.action.setBadgeText({ text: '' })
      chrome.storage.local.set({ comicRocketReader: {
        isLoggedIn: false,
        lastError: err ? err.message : 'Unknown error'
      }})
    })
}

const updateComics = comicRocketReader => {
  fetch(FETCH_COMICS, { credentials: 'include' })
    .then(response => response.json())
    .then(data => {
      const unreadPages = countUnreadPages(data.filter(comic => comicRocketReader.backlog.indexOf(comic.slug) === -1))
      chrome.action.setBadgeText({ text: unreadPages < 10000 ? '' + unreadPages : 'Lots' })
      comicRocketReader.comics = data
      chrome.storage.local.set({ comicRocketReader })
    })
    .catch(err => {
      chrome.storage.local.set({ comicRocketReader: {
        ...comicRocketReader,
        lastError: 'updateComics failed: ' + (err ? err.message : 'Unknown error')
      }})
    })
}

// MV3: Use chrome.alarms instead of setTimeout for periodic checks in service workers
chrome.alarms.create('loginCheck', { periodInMinutes: 0.5 })

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'loginCheck') {
    checkLogin()
  }
})

// Run immediately on service worker startup
checkLogin()
