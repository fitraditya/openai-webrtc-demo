const startButton = document.getElementById('startButton')
const tokenInput = document.getElementById('tokenInput')
const instructionInput = document.getElementById('instructionInput')

let peerConnection = null
let audioStream = null
let start = false

async function startSession() {
  const resp = await createSession(tokenInput.value)

  if (resp.ok) {
    const data = await resp.json()
    const key = data.client_secret.value
    localStorage.setItem('ephemeral_key', key)
  }

  audioStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  })
}

async function createSession(token) {
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json'
  }

  const opts = {
    method: 'POST',
    body: JSON.stringify({
      model: 'gpt-4o-realtime-preview',
      modalities: ['audio', 'text'],
      instructions: instructionInput.value
    }),
    headers
  }

  return await fetch('https://api.openai.com/v1/realtime/sessions', opts)
}

async function createPeerConnection(stream, token) {
  const pc = new RTCPeerConnection()

  pc.ontrack = e => {
    const audio = new Audio()
    audio.srcObject = e.streams[0]
    audio.play()
  }

  pc.addTrack(stream.getTracks()[0])

  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/sdp'
  }

  const opts = {
    method: 'POST',
    body: offer.sdp,
    headers
  }

  const model = 'gpt-4o-realtime-preview-2024-12-17'
  const resp = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, opts)

  await pc.setRemoteDescription({
    type: 'answer',
    sdp: await resp.text()
  })

  return pc
}

startButton.addEventListener('click', async () => {
  if (!start) {
    await startSession()

    const key = localStorage.getItem('ephemeral_key')

    peerConnection = await createPeerConnection(
      audioStream,
      key
    )

    startButton.textContent = 'Stop'
    start = true
  } else {
    peerConnection.close()
    peerConnection = null

    if (audioStream) {
      audioStream.getTracks().forEach(track => track.stop())
      audioStream = null
    }

    startButton.textContent = 'Start'
    start = false
  }
})
