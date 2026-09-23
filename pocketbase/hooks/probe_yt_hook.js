/// <reference path="../pb_data/types.d.ts" />

routerAdd('POST', '/backend/v1/probe-yt-direct', (e) => {
  const vid = 'GMc46jaxEGw'
  const out = {}
  try {
    const oembedResp = $http.send({
      url: `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${vid}&format=json`,
      method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 SkipCloud/1.0' },
      timeout: 8,
    })
    out.oembedStatus = oembedResp.statusCode
    out.oembedRaw = String(oembedResp.raw || '').substring(0, 300)
  } catch (err) {
    out.oembedErr = err.message
  }

  try {
    const ytResp = $http.send({
      url: `https://www.youtube.com/watch?v=${vid}`,
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      timeout: 12,
    })
    out.ytStatus = ytResp.statusCode
    const html = String(ytResp.raw || '')
    out.ytHtmlLen = html.length
    out.hasCaptionTracks = html.includes('captionTracks')
    out.hasPlayerResponse = html.includes('ytInitialPlayerResponse')
    const tMatch = html.match(/<title>([^<]+)<\/title>/i)
    out.title = tMatch ? tMatch[1] : null
    const captionTracksMatch = html.match(/"captionTracks":\s*(\[[^\]]+\])/)
    out.captionTracksMatchFound = Boolean(captionTracksMatch)
    if (captionTracksMatch) {
      out.captionTracksSample = captionTracksMatch[1].substring(0, 300)
    }
  } catch (err) {
    out.ytErr = err.message
  }

  return e.json(200, out)
})
