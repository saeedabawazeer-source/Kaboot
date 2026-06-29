import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { getArena } from '../constants/arenas';

const { width } = Dimensions.get('window');
const RED    = '#C0202A';
const PURPLE = '#6B21A8';
const BLACK  = '#0d0d0d';

export default function HomeScreen({ navigation }) {
  const [trophies, setTrophies] = useState(0);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('kaboot_trophies').then(v => setTrophies(parseInt(v || '0')));
  }, []));

  const arena = getArena(trophies);

  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      <View style={{ height: 64 }} />

      {/* Logo */}
      <Text style={s.logoAr}>كابوت</Text>
      <Text style={s.logoEn}>Kaboot</Text>
      <View style={s.underline} />

      {/* Trophy + arena row */}
      <View style={s.trophyRow}>
        <View style={s.trophyBadge}>
          <Text style={s.trophyTxt}>🏆  {trophies}</Text>
        </View>
        <Text style={s.arenaTxt}>{arena.icon} {arena.nameAr}</Text>
      </View>

      {/* New Game button */}
      <TouchableOpacity
        style={s.playBtn}
        onPress={() => navigation.navigate('Game', { trophies })}
        activeOpacity={0.85}
      >
        <Text style={s.playIcon}>▶</Text>
        <View style={{ gap: 2 }}>
          <Text style={s.playAr}>لعبة جديدة</Text>
          <Text style={s.playEn}>New Game</Text>
        </View>
      </TouchableOpacity>

      {/* Secondary grid */}
      <View style={s.grid}>
        <TouchableOpacity style={s.gridBtn} onPress={() => navigation.navigate('Rules')} activeOpacity={0.85}>
          <Text style={s.gridIcon}>📖</Text>
          <Text style={s.gridLabelAr}>القواعد</Text>
          <Text style={s.gridLabelEn}>Rules</Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.gridBtn} onPress={() => navigation.navigate('Arenas', { trophies })} activeOpacity={0.85}>
          <Text style={s.gridIcon}>🏆</Text>
          <Text style={s.gridLabelAr}>النتائج</Text>
          <Text style={s.gridLabelEn}>Scores</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[s.gridBtn, { opacity: 0.45 }]} activeOpacity={0.7}>
          <Text style={s.gridIcon}>👥</Text>
          <Text style={s.gridLabelAr}>متعدد</Text>
          <Text style={s.gridLabelEn}>Multiplayer</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.tagline}>أنت + الشريك  ضد  الخصمين</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RED,
    alignItems: 'center',
    paddingHorizontal: 22,
  },

  /* Logo */
  logoAr: {
    fontSize: 84,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 4,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  logoEn: {
    fontSize: 20,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '400',
    letterSpacing: 6,
    textAlign: 'center',
  },
  underline: {
    width: 72,
    height: 3,
    backgroundColor: PURPLE,
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 22,
  },

  /* Trophy row */
  trophyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 40,
  },
  trophyBadge: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  trophyTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  arenaTxt: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },

  /* New Game */
  playBtn: {
    width: '100%',
    backgroundColor: BLACK,
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
    marginBottom: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 12,
  },
  playIcon: { color: '#fff', fontSize: 26 },
  playAr: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: 1 },
  playEn: { color: 'rgba(255,255,255,0.45)', fontSize: 13 },

  /* Grid */
  grid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 28,
  },
  gridBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 6,
  },
  gridIcon: { fontSize: 28 },
  gridLabelAr: { color: '#111', fontSize: 14, fontWeight: '800' },
  gridLabelEn: { color: '#999', fontSize: 11 },

  tagline: {
    color: 'rgba(255,255,255,0.38)',
    fontSize: 13,
    textAlign: 'center',
    letterSpacing: 1,
  },
});
