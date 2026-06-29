import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { cardLabel, SUIT_SYMBOLS, isRed } from '../game/engine';

/**
 * A single playing card.
 * Props:
 *  card       – { suit, value }
 *  size       – 'sm' | 'md' | 'lg' (default 'md')
 *  faceDown   – boolean
 *  selected   – boolean (lifted up, gold border)
 *  dimmed     – boolean (greyed out = unplayable)
 *  isTrump    – boolean (orange border)
 *  onPress    – callback
 */
export default function PlayingCard({
  card,
  size = 'md',
  faceDown = false,
  selected = false,
  dimmed = false,
  isTrump = false,
  onPress,
}) {
  const dims = {
    sm: { width: 28, height: 42, fontSize: 10, suitFSize: 10, centerFSize: 16, pad: 2 },
    md: { width: 46, height: 66, fontSize: 13, suitFSize: 12, centerFSize: 24, pad: 3 },
    lg: { width: 54, height: 78, fontSize: 15, suitFSize: 14, centerFSize: 28, pad: 4 },
  }[size];

  if (faceDown) {
    return (
      <View style={[
        styles.faceDown,
        { width: dims.width, height: dims.height, borderRadius: dims.width * 0.15 },
      ]}>
        <Text style={styles.faceDownText}>🂠</Text>
      </View>
    );
  }

  if (!card) return null;

  const red = isRed(card.suit);
  const color = red ? '#d32f2f' : '#111';
  const sym = SUIT_SYMBOLS[card.suit];
  const val = cardLabel(card.value);

  const cardStyle = [
    styles.card,
    {
      width: dims.width,
      height: dims.height,
      borderRadius: dims.width * 0.15,
      padding: dims.pad,
    },
    selected && styles.selected,
    dimmed && styles.dimmed,
    isTrump && styles.trumpBorder,
  ];

  const Content = (
    <View style={cardStyle}>
      {/* Top-left */}
      <View style={styles.corner}>
        <Text style={[styles.val, { fontSize: dims.fontSize, color }]}>{val}</Text>
        <Text style={[styles.suitSm, { fontSize: dims.suitFSize, color }]}>{sym}</Text>
      </View>
      {/* Center suit */}
      <Text style={[styles.centerSuit, { fontSize: dims.centerFSize, color }]}>{sym}</Text>
      {/* Bottom-right (rotated) */}
      <View style={[styles.corner, styles.cornerBot]}>
        <Text style={[styles.val, { fontSize: dims.fontSize, color }]}>{val}</Text>
        <Text style={[styles.suitSm, { fontSize: dims.suitFSize, color }]}>{sym}</Text>
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={selected && { marginBottom: 12 }}>
        {Content}
      </TouchableOpacity>
    );
  }
  return Content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    justifyContent: 'space-between',
    alignItems: 'stretch',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 6,
    position: 'relative',
  },
  selected: {
    borderWidth: 2,
    borderColor: '#ffd700',
    shadowColor: '#ffd700',
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  dimmed: {
    opacity: 0.4,
  },
  trumpBorder: {
    borderColor: '#ff8c00',
    borderWidth: 2,
  },
  corner: {
    alignItems: 'flex-start',
  },
  cornerBot: {
    alignItems: 'flex-end',
    transform: [{ rotate: '180deg' }],
  },
  val: {
    fontWeight: '800',
    lineHeight: 16,
  },
  suitSm: {
    lineHeight: 14,
  },
  centerSuit: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -12 }, { translateY: -14 }],
  },
  faceDown: {
    backgroundColor: '#1a1a6e',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
    elevation: 4,
  },
  faceDownText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.3)',
  },
});
