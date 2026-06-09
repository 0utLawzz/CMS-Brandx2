import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/colors';

const UPCOMING = [
  { icon: '📰', title: 'JOURNAL BROWSER', desc: 'Browse official IPO trademark journals by date and issue number.' },
  { icon: '🔍', title: 'OPPOSITION TRACKER', desc: 'Monitor opposition periods and track filed objections.' },
  { icon: '📋', title: 'IPO DATA SYNC', desc: 'Cross-reference marks against IPO public database entries.' },
  { icon: '📊', title: 'ANALYTICS', desc: 'Visual reports on acceptance rates, class distribution, and timelines.' },
];

export default function JournalScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.stamp}>
        <Text style={styles.stampText}>COMING SOON</Text>
      </View>

      <Text style={styles.title}>JOURNAL &{'\n'}IPO DATA</Text>
      <Text style={styles.subtitle}>
        This module is under development. It will connect directly to official IPO journal data.
      </Text>

      <View style={styles.featureList}>
        {UPCOMING.map((f, i) => (
          <View key={i} style={styles.featureCard}>
            <Text style={styles.featureIcon}>{f.icon}</Text>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>{f.title}</Text>
              <Text style={styles.featureDesc}>{f.desc}</Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.note}>No API key or external auth required for this module.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream, alignItems: 'center', paddingHorizontal: 20, paddingTop: 40 },
  stamp: {
    backgroundColor: COLORS.yellow,
    borderWidth: 3,
    borderColor: COLORS.black,
    borderRadius: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 5,
    marginBottom: 20,
    transform: [{ rotate: '-4deg' }],
  },
  stampText: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: COLORS.black, letterSpacing: 3 },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 48,
    color: COLORS.black,
    letterSpacing: 2,
    textAlign: 'center',
    lineHeight: 52,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 14,
    color: COLORS.dim,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  featureList: { width: '100%', gap: 10, marginBottom: 24 },
  featureCard: {
    backgroundColor: COLORS.white,
    borderWidth: 2.5,
    borderColor: COLORS.black,
    borderRadius: 6,
    padding: 14,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
    shadowColor: COLORS.black,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
  },
  featureIcon: { fontSize: 24 },
  featureInfo: { flex: 1 },
  featureTitle: { fontFamily: 'DMMono_500Medium', fontSize: 11, color: COLORS.orange, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3 },
  featureDesc: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: COLORS.dim, lineHeight: 18 },
  note: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.gray, letterSpacing: 0.5, textAlign: 'center' },
});
