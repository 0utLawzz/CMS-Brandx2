import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

interface Props {
  value: string | number;
  label: string;
  accent?: string;
}

export default function StatTile({ value, label, accent = COLORS.orange }: Props) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 2.5,
    borderColor: COLORS.black,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4,
  },
  value: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 28,
    lineHeight: 32,
  },
  label: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 8,
    color: COLORS.gray,
    letterSpacing: 0.5,
    textAlign: 'center',
    marginTop: 2,
  },
});
