import { httpClient } from '@/api/httpClient'
import { SubsonicResponse } from '@/types/responses/subsonicResponse'
import dateTime from '@/utils/dateTime'

async function send(id: string, time?: string) {
  const response = await httpClient<SubsonicResponse>('/scrobble', {
    method: 'GET',
    query: {
      id,
      time: time ?? dateTime().valueOf().toString(),
    },
  })

  if (!response || response.data?.status !== 'ok') {
    throw new Error('Scrobble request failed')
  }
}

async function sendNowPlaying(id: string) {
  const response = await httpClient<SubsonicResponse>('/scrobble', {
    method: 'GET',
    query: {
      id,
      submission: 'false',
    },
  })

  if (!response || response.data?.status !== 'ok') {
    throw new Error('Now playing request failed')
  }
}

export const scrobble = {
  send,
  sendNowPlaying,
}
