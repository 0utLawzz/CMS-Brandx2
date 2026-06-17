import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';
import { StageCount } from '../hooks/useSheet';

interface Props {
  stages: StageCount;
  total: number;
}

const BARS = [
  { key: 's1' as keyof StageCount, label: 'STAGE 1', color: COLORS.orange },
  { key: 's2' as keyof StageCount, label: 'STAGE 2', color: COLORS.teal },
  { key: 's3' as keyof StageCount, label: 'STAGE 3', color: COLORS.yellow },
  { key: 's4' as keyof StageCount, label: 'STAGE 4', color: COLORS.tealLt },
  { key: 'stopped' as keyof StageCount, label: 'STOPPED', color: COLORS.gray },
];

export default function StageChart({ stages, total }: Props) {
  if (!total) return null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>STAGE DISTRIBUTION</Text>
        <Text style={styles.totalBadge}>{total} TOTAL</Text>
      </View>
      {BARS.map(({ key, label, color }) => {
        const count = stages[key] ?? 0;
        const pct = total > 0 ? (count / total) * 100 : 0;
        return (
          <View key={key} style={styles.barRow}>
            <Text style={styles.barLabel}>{label}</Text>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  { width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` as unknown as number, backgroundColor: color },
                ]}
              />
            </View>
            <Text style={[styles.barCount, { color }]}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: COLORS.black,
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
    shadowColor: COLORS.black,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.cream2,
  },
  title: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    color: COLORS.black,
    letterSpacing: 1.5,
  },
  totalBadge: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 10,
    color: COLORS.orange,
    letterSpacing: 0.5,
    borderWidth: 2,
    borderColor: COLORS.orange,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: COLORS.statusRedBg,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 7,
    gap: 8,
  },
  barLabel: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 9,
    color: COLORS.gray,
    width: 52,
    letterSpacing: 0.3,
  },
  barTrack: {
    flex: 1,
    height: 14,
    backgroundColor: COLORS.cream2,
    borderWidth: 1.5,
    borderColor: COLORS.black,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 1,
  },
  barCount: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 16,
    width: 36,
    textAlign: 'right',
  },
});
