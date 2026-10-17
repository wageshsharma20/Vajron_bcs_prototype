import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { startWhep } from '../services/whep';
import { typography } from '../theme';

/**
 * The real camera, over WebRTC. Reconnects by itself: a drone's video link
 * drops and returns as the aircraft moves, and the operator should not have to
 * do anything to get the picture back.
 */
export default function LiveCamera({ url, onState }: { url: string; onState?: (s: 'connecting' | 'live' | 'error') => void }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [state, setState] = useState<'connecting' | 'live' | 'error'>('connecting');
  const [error, setError] = useState('');

  useEffect(() => { onState?.(state); }, [state]);

  useEffect(() => {
    let pc: RTCPeerConnection | null = null;
    let cancelled = false;
    let retry: ReturnType<typeof setTimeout> | null = null;

    const connect = async () => {
      setState('connecting');
      try {
        pc = await startWhep(url, stream => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        });
        pc.onconnectionstatechange = () => {
          if (!pc) return;
          if (pc.connectionState === 'connected') setState('live');
          if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
            pc.close();
            pc = null;
            if (!cancelled) { setState('error'); setError('stream interrupted'); retry = setTimeout(connect, 3000); }
          }
        };
      } catch (e: any) {
        if (cancelled) return;
        setState('error');
        setError(e?.message ?? 'could not reach the camera server');
        retry = setTimeout(connect, 5000);
      }
    };
    connect();
    return () => { cancelled = true; if (retry) clearTimeout(retry); pc?.close(); };
  }, [url]);

  return (
    <View style={StyleSheet.absoluteFill}>
      {React.createElement('video', {
        ref: videoRef,
        autoPlay: true,
        muted: true,
        playsInline: true,
        style: { width: '100%', height: '100%', objectFit: 'cover', background: '#000' },
      })}
      {state !== 'live' ? (
        <View style={styles.veil} pointerEvents="none">
          <Text style={styles.text}>{state === 'connecting' ? 'CONNECTING TO CAMERA…' : 'CAMERA UNAVAILABLE'}</Text>
          {state === 'error' ? <Text style={styles.sub}>{error} · retrying</Text> : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  veil: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,42,27,0.74)' },
  text: { color: '#FFFFFF', fontFamily: typography.fonts.bold, fontSize: 14, letterSpacing: 1.5 },
  sub: { color: '#A3C9AE', fontFamily: typography.fonts.medium, fontSize: 12, marginTop: 4 },
});
