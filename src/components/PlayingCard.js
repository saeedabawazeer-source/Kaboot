import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { cardLabel, SUIT_SYMBOLS, isRed } from '../game/engine';

/**
 * Playing card component.
 * Props:
 *  card       – { suit, value }
 *  size       – 'sm' | 'md' | 'lg' | 'xl' (default 'md')
 *  faceDown   – boolean
 *  selected   – boolean (lifted, gold glow)
 *  dimmed     – boolean (greyed out / unplayable)
 *  isTrump    – boolean (orange accent border)
 */
export default function PlayingCard({
  card,
  size = 'md',
  faceDown = false,
  selected = false,
  dimmed = false,
  isTrump = false,
}) {
  const D = {
    sm: { w: 34,  h: 50,  val: 11, suit: 10, center: 18, r: 5,  pad: 2 },
    md: { w: 50,  h: 72,  val: 14, suit: 12, center: 24, r: 7,  pad: 3 },
    lg: { w: 64,  h: 92,  val: 17, suit: 15, center: 30, r: 9,  pad: 4 },
    xl: { w: 82,  h: 118, val: 22, suit: 18, center: 40, r: 12, pad: 5 },
  }[size] || { w: 50, h: 72, val: 14, suit: 12, center: 24, r: 7, pad: 3 };

  /* ── Face-down ── */
  if (faceDown) {
    return (
      <View style={[
        s.faceDown,
        { width: D.w, height: D.h, borderRadius: D.r },
      ]}>
        <View style={s.fdInner}>
          <Text style={[s.fdSym, { fontSize: D.center * 0.55 }]}>🂠</Text>
        </View>
      </View>
    );
  }

  if (!card) return null;

  const red   = isRed(card.suit);
  const color = red ? '#d32f2f' : '#111111';
  const sym   = SUIT_SYMBOLS[card.suit];
  const val   = cardLabel(card.value);

  return (
    <View style={[
      s.card,
      { width: D.w, height: D.h, borderRadius: D.r, padding: D.pad },
      selected && s.selected,
      dimmed   && s.dimmed,
      isTrump  && s.trump,
    ]}>
      {/* Top-left corner */}
      <View style={s.cornerTL}>
        <Text style={[s.valTxt, { fontSize: D.val, color }]}>{val}</Text>
        <Text style={[s.suitTxt, { fontSize: D.suit, color }]}>{sym}</Text>
      </View>

      {/* Center suit symbol */}
      <View style={s.centerWrap}>
        <Text style={[s.centerSym, { fontSize: D.center, color }]}>{sym}</Text>
      </View>

      {/* Bottom-right corner (rotated) */}
      <View style={[s.cornerTL, s.cornerBR]}>
        <Text style={[s.valTxt, { fontSize: D.val, color }]}>{val}</Text>
        <Text style={[s.suitTxt, { fontSize: D.suit, color }]}>{sym}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  selected: {
    borderColor: '#ffd700',
    borderWidth: 2.5,
    shadowColor: '#ffd700',
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 10,
  },
  dimmed: {
    opacity: 0.38,
  },
  trump: {
    borderColor: '#ff8c00',
    borderWidth: 2,
  },

  /* Corners */
  cornerTL: {
    alignItems: 'flex-start',
    lineHeight: 1,
  },
  cornerBR: {
    alignItems: 'flex-end',
    transform: [{ rotate: '180deg' }],
  },
  valTxt: {
    fontWeight: '800',
    lineHeight: 20,
    includeFontPadding: false,
  },
  suitTxt: {
    lineHeight: 14,
    includeFontPadding: false,
  },

  /* Center symbol */
  centerWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerSym: {
    fontWeight: '400',
  },

  /* Face-down */
  faceDown: {
    backgroundColor: '#4a1480',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 5,
    overflow: 'hidden',
  },
  fdInner: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.08)',
    margin: 4,
  },
  fdSym: {
    color: 'rgba(255,255,255,0.3)',
  },
});
