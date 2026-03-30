/* global chrome */

import http from 'axios'
import { FETCH_COMICS, LOGIN_CHECK } from '../../app/api/Paths'
import { countUnreadPages } from '../../app/utils/ComicsUtil'

const defaultStorage = {
  comics: [],
  backlog: []
}

// MV3: service workers don't inherit browser cookies automatically,
// so we must send credentials explicitly with every request
const requestConfig = { withCredentials: true }

const checkLogin = () => {
  http.get(LOGIN_CHECK, requestConfig).then(() => {
    chrome.storage.local.get('comicRocketReader', storage => {
      const comicRocketReader = storage.comicRocketReader || defaultStorage
      comicRocketReader.isLoggedIn = true
      updateComics(comicRocketReader)
    })
  }).catch(() => {
    chrome.action.setBadgeText({ text: '' })
    chrome.storage.local.set({comicRocketReader: {
      isLoggedIn: false
    }})
  })
}

const updateComics = comicRocketReader => {
  http.get(FETCH_COMICS, requestConfig).then((result) => {
    const unreadPages = countUnreadPages(result.data.filter(comic => comicRocketReader.backlog.indexOf(comic.slug) === -1))
    chrome.action.setBadgeText({ text: unreadPages < 10000 ? '' + unreadPages : 'Lots' })
    comicRocketReader.comics = result.data
    chrome.storage.local.set({comicRocketReader})
  })
}

// MV3: Use chrome.alarms instead of setTimeout for periodic checks in service workers
chrome.alarms.create('loginCheck', { periodInMinutes: 0.5 }) // every 30 seconds

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'loginCheck') {
    checkLogin()
  }
})

// Run immediately on service worker startup
checkLogin()
