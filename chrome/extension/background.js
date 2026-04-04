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
          comicRocketReader.backlog = comicRocketReader.backlog || []
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
  const backlog = comicRocketReader.backlog || []
  fetch(FETCH_COMICS, { credentials: 'include' })
    .then(response => response.json())
    .then(data => {
      const comics = Array.isArray(data) ? data : []
      const unreadPages = countUnreadPages(comics.filter(comic => backlog.indexOf(comic.slug) === -1))
      chrome.action.setBadgeText({ text: unreadPages < 10000 ? '' + unreadPages : 'Lots' })
      comicRocketReader.comics = comics
      comicRocketReader.backlog = backlog
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
