import React, { useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, typography } from '../theme';
import { BRIDGE_URL, CAMERA_URL, COMMAND_TOKEN, SIM_ENABLED, loadConnection, saveConnection } from '../config';

/**
 * Where this station gets its aircraft from.
 *
 * A web page cannot open a radio or a USB port itself, so a real drone is
 * reached through the Vajron bridge running on the computer (or Pi) that the
 * drone's telemetry radio is plugged into. The simulator needs nothing.
 */
export default function ConnectionPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { theme } = useTheme();
  const saved = loadConnection();
  const [source, setSource] = useState<'sim' | 'bridge'>(SIM_ENABLED ? 'sim' : 'bridge');
  const [url, setUrl] = useState(saved?.bridgeUrl ?? BRIDGE_URL);
  const [token, setToken] = useState(saved?.token ?? COMMAND_TOKEN ?? '');
  const [camera, setCamera] = useState(saved?.cameraUrl ?? CAMERA_URL ?? '');

  const option = (key: 'sim' | 'bridge', title: string, body: string) => {
    const on = source === key;
    return (
      <TouchableOpacity
        onPress={() => setSource(key)}
        accessibilityRole="radio"
        accessibilityState={{ checked: on }}
        style={[styles.option, { borderColor: on ? theme.brand : theme.hairline, backgroundColor: on ? theme.surface : theme.background }]}
      >
        <View style={[styles.radio, { borderColor: theme.brand }]}>
          {on ? <View style={[styles.radioDot, { backgroundColor: theme.brand }]} /> : null}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.optionTitle, { color: theme.textPrimary }]}>{title}</Text>
          <Text style={[styles.optionBody, { color: theme.textSecondary }]}>{body}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.scrim, { backgroundColor: theme.overlay }]}>
        <View style={[styles.card, { backgroundColor: theme.background }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Connection</Text>

          {option('sim', 'Simulator',
            'Try the station with a simulated aircraft. Nothing is connected to a real drone.')}
          {option('bridge', 'Drone (via the Vajron bridge)',
            'For a real aircraft. Run the bridge on the computer or Pi that the drone’s telemetry radio is plugged into.')}

          {source === 'bridge' ? (
            <View style={{ marginTop: 14 }}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>BRIDGE ADDRESS</Text>
              <TextInput
                value={url}
                onChangeText={setUrl}
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { borderColor: theme.hairline, color: theme.textPrimary }]}
              />
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                Same computer: http://localhost:8082 {'·'} Raspberry Pi: https://&lt;pi-address&gt;:8443/bridge
              </Text>
              <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>COMMAND TOKEN (OPTIONAL)</Text>
              <TextInput
                value={token}
                onChangeText={setToken}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={[styles.input, { borderColor: theme.hairline, color: theme.textPrimary }]}
              />
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                Needed only if the bridge was started with --command-token. Stored in this browser only.
              </Text>
              <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>CAMERA STREAM (OPTIONAL)</Text>
              <TextInput
                value={camera}
                onChangeText={setCamera}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="http://localhost:8889/cam/whep"
                style={[styles.input, { borderColor: theme.hairline, color: theme.textPrimary }]}
              />
              <Text style={[styles.hint, { color: theme.textSecondary }]}>
                The camera’s WebRTC (WHEP) address from MediaMTX. Without it, no picture is shown.
              </Text>
            </View>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={[styles.button, { borderColor: theme.hairline }]}>
              <Text style={[styles.buttonText, { color: theme.textPrimary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => saveConnection(source === 'sim'
                ? { source: 'sim' }
                : { source: 'bridge', bridgeUrl: url.trim(), token: token.trim() || undefined, cameraUrl: camera.trim() || undefined })}
              style={[styles.button, { backgroundColor: theme.brand, borderColor: theme.brand }]}
            >
              <Text style={[styles.buttonText, { color: theme.onBrand }]}>Connect</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 520, padding: 24 },
  title: { fontFamily: typography.fonts.bold, fontSize: 20, marginBottom: 16 },
  option: { flexDirection: 'row', borderWidth: 1, padding: 14, marginBottom: 10, alignItems: 'flex-start' },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, marginRight: 12, marginTop: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  optionTitle: { fontFamily: typography.fonts.semiBold, fontSize: 15 },
  optionBody: { fontFamily: typography.fonts.regular, fontSize: 13, marginTop: 3, lineHeight: 18 },
  label: { fontFamily: typography.fonts.bold, fontSize: 10, letterSpacing: 1.2, marginBottom: 6 },
  input: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, fontFamily: typography.fonts.regular, fontSize: 14 },
  hint: { fontFamily: typography.fonts.regular, fontSize: 12, marginTop: 6 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 10 },
  button: { borderWidth: 1, paddingHorizontal: 18, paddingVertical: 10 },
  buttonText: { fontFamily: typography.fonts.semiBold, fontSize: 14 },
});
