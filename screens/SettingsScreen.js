import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import React, { useContext } from 'react';
import { ImageBackground, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { setMusicVolume as applyMusicVolume } from '../shared/AudioManager';
import { SettingsContext } from '../shared/SettingsContext';

export default function SettingsScreen({ navigation }) {
  const {
    soundEnabled, setSoundEnabled,
    musicEnabled, setMusicEnabled,
    hapticsEnabled, setHapticsEnabled,
    musicVolume, setMusicVolume,
    soundVolume, setSoundVolume,
    hapticsStrength, setHapticsStrength,
  } = useContext(SettingsContext);

  // native slider

  const options = [
    { label: 'Yavaş', ms: 28 },
    { label: 'Orta', ms: 12 },
    { label: 'Hızlı', ms: 6 },
  ];

  const BG_URL = 'https://img.freepik.com/free-photo/halloween-day-celebration-with-costume_23-2151880079.jpg?semt=ais_hybrid&w=740&q=80';

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ImageBackground source={{ uri: BG_URL }} style={styles.bg} resizeMode="cover" blurRadius={6}>
        <View style={styles.bgOverlay} />

        <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>

        <View style={styles.pageContent}>
          <View style={styles.card}>
            <Text style={styles.title}>Settings</Text>

            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemLabel}>Sound Effects</Text>
                <Text style={styles.itemSub}>Button and feedback sounds</Text>
                <View style={styles.sliderContainer}>
                  <Slider
                    style={styles.sliderNative}
                    value={soundVolume}
                    onValueChange={setSoundVolume}
                    minimumValue={0}
                    maximumValue={1}
                    step={0.01}
                    minimumTrackTintColor="#6c5ce7"
                    maximumTrackTintColor="rgba(255,255,255,0.2)"
                    thumbTintColor="#ffffff"
                  />
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemLabel}>Music</Text>
                <Text style={styles.itemSub}>Background music</Text>
                <View style={styles.sliderContainer}>
                  <Slider
                    style={styles.sliderNative}
                    value={musicVolume}
                    onValueChange={setMusicVolume}
                    onSlidingComplete={applyMusicVolume}
                    minimumValue={0}
                    maximumValue={1}
                    step={0.01}
                    minimumTrackTintColor="#6c5ce7"
                    maximumTrackTintColor="rgba(255,255,255,0.2)"
                    thumbTintColor="#ffffff"
                  />
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemLabel}>Vibration</Text>
                <Text style={styles.itemSub}>Haptic feedback</Text>
              </View>
              <TouchableOpacity onPress={() => setHapticsEnabled(!hapticsEnabled)} style={[styles.toggle, hapticsEnabled && styles.toggleOn]}>
                <View style={[styles.knob, hapticsEnabled && styles.knobOn]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1115',
    padding: 0,
  },
  bg: { flex: 1 },
  bgOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  pageContent: { flex: 1, paddingHorizontal: 20, paddingTop: 90, paddingBottom: 20 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
  },
  title: {
    color: '#f1f3f4',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  itemLabel: {
    color: '#e8eaed',
    fontSize: 16,
    fontWeight: '700',
  },
  itemSub: {
    color: '#9aa0a6',
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerBackButton: {
    position: 'absolute',
    top: 20,
    left: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  sectionTitle: {
    color: '#e8eaed',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
  },
  section: {
    marginTop: 24,
  },
  pill: {
    backgroundColor: '#202124',
    borderWidth: 1,
    borderColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginRight: 8,
  },
  pillActive: {
    backgroundColor: '#6c5ce7',
    borderColor: '#6c5ce7',
  },
  pillText: {
    color: '#c7c9cc',
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#fff',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  label: {
    color: '#e8eaed',
    fontSize: 16,
    fontWeight: '600',
  },
  toggle: {
    width: 52,
    height: 30,
    borderRadius: 999,
    backgroundColor: '#3a3b3e',
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: '#6c5ce7',
  },
  knob: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#fff',
    transform: [{ translateX: 0 }],
  },
  knobOn: {
    transform: [{ translateX: 22 }],
  },
  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sliderContainer: { marginTop: 12, paddingVertical: 10 },
  sliderNative: { height: 28 },
  toggleMini: {
    width: 40,
    height: 24,
    borderRadius: 999,
    backgroundColor: '#3a3b3e',
    padding: 2,
    justifyContent: 'center',
  },
  knobMini: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', transform: [{ translateX: 0 }] },
  knobMiniOn: { transform: [{ translateX: 16 }] },
  sliderTrack: {
    flex: 1,
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.20)',
    position: 'relative',
    overflow: 'hidden',
  },
  sliderFill: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    backgroundColor: '#6c5ce7',
    borderRadius: 999,
  },
  sliderThumb: {
    position: 'absolute', top: -7, width: 22, height: 22, borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4,
    marginLeft: -11,
  },
  inputLabel: {
    color: '#e8eaed',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 6,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#e8eaed',
  },
});




