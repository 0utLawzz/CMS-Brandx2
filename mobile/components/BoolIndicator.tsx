import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

interface Props {
  label: string;
  value: boolean;
  type?: 'warning' | 'positive';
}

export default function BoolIndicator({ label, value, type = 'warning' }: Props) {
  const isActive = value;
  const activeColor = type === 'warning' ? COLORS.orange : COLORS.tealLt;
  const activeBg = type === 'warning' ? 'rgba(201,74,0,0.10)' : 'rgba(13,153,112,0.12)';
  const icon = type === 'warning' ? (isActive ? '⚠' : '○') : (isActive ? '✓' : '○');

  const color = isActive ? activeColor : COLORS.gray;
  const bgColor = isActive ? activeBg : 'rgba(102,102,102,0.06)';
  const borderColor = isActive ? activeColor : COLORS.cream2;

  return (
    <View style={[styles.wrap, { borderColor, backgroundColor: bgColor }]}>
      <Text style={[styles.icon, { color }]}>{icon}</Text>
      <View>
        <Text style={styles.label}>{label.toUpperCase()}</Text>
        <Text style={[styles.value, { color }]}>
          {isActive ? (type === 'warning' ? 'YES ⚠' : 'YES') : 'NO'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    flex: 1,
    gap: 6,
  },
  icon: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 14,
  },
  label: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 8,
    color: COLORS.gray,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  value: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
