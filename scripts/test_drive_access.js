// Script temporário para verificar acesso ao vídeo do Google Drive
const url = 'https://drive.google.com/uc?export=download&id=1g50Y8lbCK8G_5rmCvF93k_y7kbf01yPS'

async function testVideoAccess() {
  console.log('Testing URL:', url)
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    console.log('Final Status:', res.status, res.statusText)
    console.log('Final URL:', res.url)
    const contentType = res.headers.get('content-type') || ''
    console.log('Final Content-Type:', contentType)
    const contentLength = res.headers.get('content-length')
    console.log('Content-Length:', contentLength)

    const bodyPreview = await res.text()
    console.log('Body length:', bodyPreview.length)
    console.log('Body start:', bodyPreview.substring(0, 500))

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
    const isVirusWarning =
      bodyPreview.includes('download_warning') || bodyPreview.includes('confirm=')
    const isVideoMedia =
      contentType.toLowerCase().startsWith('video/') ||
      contentType.toLowerCase().includes('application/octet-stream')

    console.log('Is HTML:', isHtml)
    console.log('Is Login/Restricted Page:', isLoginPage)
    console.log('Is Virus Warning Interstitial:', isVirusWarning)
    console.log('Is Video Media:', isVideoMedia)
  } catch (err) {
    console.error('Fetch error:', err)
  }
}

testVideoAccess()
