import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/colors';

const AVATAR_COLORS = [
  COLORS.orange, COLORS.teal, COLORS.yellow, COLORS.tealLt,
  '#8B2FC9', '#2563EB', '#DC2626', '#7C3AED',
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

interface Props {
  name: string;
  size?: number;
}

export default function ThumbnailAvatar({ name, size = 40 }: Props) {
  const initials = (name || 'TM')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || 'TM';

  const bgColor = AVATAR_COLORS[hashCode(name) % AVATAR_COLORS.length];
  const fontSize = size * 0.35;

  return (
    <View style={[
      styles.avatar,
      {
        width: size,
        height: size,
        backgroundColor: bgColor,
        borderRadius: 4,
      }
    ]}>
      <Text style={[styles.initials, { fontSize, color: COLORS.white }]}>{initials}</Text>
      <View style={[styles.tmTag, { bottom: -4, right: -4 }]}>
        <Text style={styles.tmText}>™</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: COLORS.black,
    shadowColor: COLORS.black,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    position: 'relative',
  },
  initials: {
    fontFamily: 'BebasNeue_400Regular',
    letterSpacing: 1,
  },
  tmTag: {
    position: 'absolute',
    backgroundColor: COLORS.black,
    borderRadius: 2,
    paddingHorizontal: 2,
    paddingVertical: 0,
  },
  tmText: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 7,
    color: COLORS.white,
  },
});
