import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStatusClass, getStatusStyle } from '../lib/status';
import { COLORS } from '../constants/colors';

interface Props {
  label: string;
  value: string;
  forceClass?: ReturnType<typeof getStatusClass>;
}

export default function StatusBadge({ label, value, forceClass }: Props) {
  if (!value) return null;
  const cls = forceClass ?? getStatusClass(value);
  const { borderColor, textColor, backgroundColor } = getStatusStyle(cls);

  return (
    <View style={[styles.badge, { borderColor, backgroundColor }]}>
      <Text style={[styles.labelText, { color: COLORS.gray }]}>{label.toUpperCase()} · </Text>
      <Text style={[styles.valueText, { color: textColor }]} numberOfLines={1}>
        {value.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  labelText: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  valueText: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
});
