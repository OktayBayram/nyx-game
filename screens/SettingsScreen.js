import React, { useContext } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SettingsContext } from '../shared/SettingsContext';

export default function SettingsScreen() {
  const { typeSpeedMs, setTypeSpeedMs } = useContext(SettingsContext);

  const options = [
    { label: 'Yavaş', ms: 28 },
    { label: 'Orta', ms: 12 },
    { label: 'Hızlı', ms: 6 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.sectionTitle}>Daktilo Hızı</Text>
      <View style={styles.row}>
        {options.map((opt, idx) => {
          const active = typeSpeedMs === opt.ms;
          return (
            <TouchableOpacity
              key={idx}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setTypeSpeedMs(opt.ms)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
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
});




