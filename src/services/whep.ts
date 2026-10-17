/**
 * Receive a live camera stream over WebRTC using WHEP.
 *
 * Drone cameras such as the SIYI ZR10 output RTSP, which browsers cannot play.
 * MediaMTX on the Pi (or the operator's computer) re-serves that stream as
 * WebRTC, which plays in any modern browser with well under a second of delay:
 *     http://<host>:8889/<path>/whep
 *
 * Non-trickle WHEP: gather ICE first, send one offer, get one answer. Fewer
 * moving parts than trickle, and the gathering wait is bounded.
 */
export async function startWhep(url: string, onStream: (s: MediaStream) => void): Promise<RTCPeerConnection> {
  const pc = new RTCPeerConnection();
  pc.addTransceiver('video', { direction: 'recvonly' });
  pc.addTransceiver('audio', { direction: 'recvonly' });
  pc.ontrack = e => {
    if (e.streams[0]) onStream(e.streams[0]);
  };
  await pc.setLocalDescription(await pc.createOffer());
  await new Promise<void>(resolve => {
    if (pc.iceGatheringState === 'complete') return resolve();
    const done = () => { if (pc.iceGatheringState === 'complete') resolve(); };
    pc.addEventListener('icegatheringstatechange', done);
    setTimeout(resolve, 2500); // a host candidate is all a LAN needs
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/sdp' },
    body: pc.localDescription!.sdp,
  });
  if (!res.ok) {
    pc.close();
    throw new Error(`camera server answered ${res.status}`);
  }
  await pc.setRemoteDescription({ type: 'answer', sdp: await res.text() });
  return pc;
}
