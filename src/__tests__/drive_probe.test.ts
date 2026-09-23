import { describe, it } from 'vitest'

describe('Direct Drive Access Test', () => {
  it('tests download access to Google Drive video url', async () => {
    const url = 'https://drive.google.com/uc?export=download&id=1g50Y8lbCK8G_5rmCvF93k_y7kbf01yPS'
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    const finalStatus = res.status
    const finalUrl = res.url
    const contentType = res.headers.get('content-type') || ''
    const bodyPreview = await res.text()

    const isHtml =
      contentType.toLowerCase().includes('text/html') ||
      bodyPreview.includes('<!DOCTYPE html>') ||
      bodyPreview.includes('<html')
    const isLoginPage =
      bodyPreview.includes('accounts.google.com') ||
      bodyPreview.includes('ServiceLogin') ||
      bodyPreview.includes('Sign in') ||
      bodyPreview.includes('Fazer login') ||
      bodyPreview.includes('Google Drive – Acesso Negado') ||
      bodyPreview.includes('Access Denied')
    const isVideoMedia =
      contentType.toLowerCase().startsWith('video/') ||
      contentType.toLowerCase().includes('application/octet-stream')

    console.log('DRIVE_TEST_OUTPUT_START')
    console.log(
      JSON.stringify({
        finalStatus,
        finalUrl,
        contentType,
        bodyLength: bodyPreview.length,
        isHtml,
        isLoginPage,
        isVideoMedia,
        sample: bodyPreview.substring(0, 300),
      }),
    )
    console.log('DRIVE_TEST_OUTPUT_END')
  })
})
