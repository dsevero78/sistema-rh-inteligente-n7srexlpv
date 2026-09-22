import https from 'node:https'
import http from 'node:http'
import { URL } from 'node:url'

const targetUrl = 'https://drive.google.com/uc?export=download&id=1g50Y8lbCK8G_5rmCvF93k_y7kbf01yPS'

function fetchUrl(urlStr, redirectCount = 0) {
  if (redirectCount > 10) {
    console.log('Too many redirects')
    return
  }

  const parsedUrl = new URL(urlStr)
  const client = parsedUrl.protocol === 'https:' ? https : http

  const req = client.get(
    urlStr,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: '*/*',
      },
    },
    (res) => {
      console.log(`\n--- Step ${redirectCount} ---`)
      console.log(`URL: ${urlStr}`)
      console.log(`Status: ${res.statusCode} ${res.statusMessage}`)
      console.log(`Headers:`, {
        'content-type': res.headers['content-type'],
        'content-length': res.headers['content-length'],
        location: res.headers['location'],
        'content-disposition': res.headers['content-disposition'],
        'set-cookie': res.headers['set-cookie']
          ? res.headers['set-cookie'].map((c) => c.split(';')[0])
          : undefined,
      })

      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let nextUrl = res.headers.location
        if (!nextUrl.startsWith('http')) {
          nextUrl = new URL(nextUrl, urlStr).toString()
        }
        console.log(`-> Redirecting to: ${nextUrl}`)
        // Consume response data to free memory
        res.resume()
        fetchUrl(nextUrl, redirectCount + 1)
        return
      }

      let dataChunks = []
      let totalLength = 0

      res.on('data', (chunk) => {
        dataChunks.push(chunk)
        totalLength += chunk.length
        // Limit sample buffer to first 500KB for inspection
        if (totalLength > 1024 * 1024) {
          res.destroy()
        }
      })

      res.on('end', () => {
        const fullBuf = Buffer.concat(dataChunks)
        console.log(`\n=== FINAL RESPONSE ===`)
        console.log(`Total bytes received in sample: ${fullBuf.length}`)
        console.log(`Content-Type: ${res.headers['content-type']}`)

        const textSample = fullBuf.toString('utf-8', 0, Math.min(fullBuf.length, 10000))
        console.log(`Preview (first 1000 chars):`)
        console.log(textSample.substring(0, 1000))

        // Check patterns
        if (textSample.includes('confirm=')) {
          console.log('\n[MATCH] "confirm=" found (virus scan warning/large file confirm)')
        }
        if (
          textSample.includes('Google Drive - Virus scan warning') ||
          textSample.includes('Google Drive - Download warning') ||
          textSample.includes('cannot scan this file for viruses')
        ) {
          console.log('\n[MATCH] Virus scan warning page detected!')
        }
        if (textSample.includes('ServiceLogin') || textSample.includes('accounts.google.com')) {
          console.log('\n[MATCH] Google Account Login required!')
        }
        if (
          textSample.includes('Access denied') ||
          textSample.includes('Você precisa de permissão') ||
          textSample.includes('You need access')
        ) {
          console.log('\n[MATCH] Permission denied / access restricted!')
        }
      })

      res.on('error', (err) => {
        console.error('Response error:', err)
      })
    },
  )

  req.on('error', (err) => {
    console.error('Request error:', err)
  })
}

console.log('Testing normalized URL:', targetUrl)
fetchUrl(targetUrl)
