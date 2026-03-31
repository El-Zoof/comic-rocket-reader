/* global chrome */

import http from 'axios'
import { FETCH_COMICS, LOGIN_CHECK } from '../../app/api/Paths'
import { countUnreadPages } from '../../app/utils/ComicsUtil'

const defaultStorage = {
  comics: [],
  backlog: []
}

const checkLogin = () => {
  http.get(LOGIN_CHECK, { withCredentials: true }).then(() => {
    chrome.storage.local.get('comicRocketReader', storage => {
      const comicRocketReader = storage.comicRocketReader || defaultStorage
      comicRocketReader.isLoggedIn = true
      comicRocketReader.lastError = null
      updateComics(comicRocketReader)
    })
  }).catch((err) => {
    const errorDetail = err && err.response
      ? `HTTP ${err.response.status}: ${err.response.statusText}`
      : (err ? err.message : 'Unknown error')
    chrome.action.setBadgeText({ text: '' })
    chrome.storage.local.set({comicRocketReader: {
      isLoggedIn: false,
      lastError: errorDetail
    }})
  })
}

const updateComics = comicRocketReader => {
  http.get(FETCH_COMICS, { withCredentials: true }).then((result) => {
    const unreadPages = countUnreadPages(result.data.filter(comic => comicRocketReader.backlog.indexOf(comic.slug) === -1))
    chrome.action.setBadgeText({ text: unreadPages < 10000 ? '' + unreadPages : 'Lots' })
    comicRocketReader.comics = result.data
    chrome.storage.local.set({comicRocketReader})
  }).catch((err) => {
    const errorDetail = err && err.response
      ? `HTTP ${err.response.status}: ${err.response.statusText}`
      : (err ? err.message : 'Unknown error')
    chrome.storage.local.set({comicRocketReader: {
      ...comicRocketReader,
      lastError: 'updateComics failed: ' + errorDetail
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
