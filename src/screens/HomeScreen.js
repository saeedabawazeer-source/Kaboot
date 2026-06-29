import React, { useCallback, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, StatusBar, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { getArena } from '../constants/arenas';

const { width } = Dimensions.get('window');
const RED = '#C0202A';

export default function HomeScreen({ navigation }) {
  const [trophies, setTrophies] = useState(0);

  useFocusEffect(useCallback(() => {
    AsyncStorage.getItem('kaboot_trophies').then(v => setTrophies(parseInt(v || '0')));
  }, []));

  const arena = getArena(trophies);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      {/* Subtle top padding */}
      <View style={{ height: 60 }} />

      {/* Logo */}
      <Text style={styles.logo}>كابوت</Text>
      <Text style={styles.logoEn}>Kaboot</Text>
      <View style={styles.underline} />

      {/* Trophy badge */}
      <View style={styles.trophyRow}>
        <Text style={styles.trophyText}>🏆 {trophies}</Text>
        <Text style={styles.arenaText}>{arena.icon} {arena.nameAr}</Text>
      </View>

      {/* Main play button */}
      <TouchableOpacity
        style={styles.playBtn}
        onPress={() => navigation.navigate('Game', { trophies })}
        activeOpacity={0.88}
      >
        <Text style={styles.playIcon}>▷</Text>
        <View>
          <Text style={styles.playBtnAr}>لعبة جديدة</Text>
          <Text style={styles.playBtnEn}>New Game</Text>
        </View>
      </TouchableOpacity>

      {/* Secondary buttons */}
      <View style={styles.grid}>
        <TouchableOpacity
          style={styles.gridBtn}
          onPress={() => navigation.navigate('Rules')}
          activeOpacity={0.85}
        >
          <Text style={styles.gridIcon}>📖</Text>
          <Text style={styles.gridLabelAr}>القواعد</Text>
          <Text style={styles.gridLabelEn}>Rules</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.gridBtn}
          onPress={() => navigation.navigate('Arenas', { trophies })}
          activeOpacity={0.85}
        >
          <Text style={styles.gridIcon}>🏆</Text>
          <Text style={styles.gridLabelAr}>النتائج</Text>
          <Text style={styles.gridLabelEn}>Scores</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.gridBtn, { opacity: 0.5 }]}
          activeOpacity={0.85}
        >
          <Text style={styles.gridIcon}>👥</Text>
          <Text style={styles.gridLabelAr}>متعدد</Text>
          <Text style={styles.gridLabelEn}>Multiplayer</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>أنت + الشريك ضد الخصمين</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RED,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    fontSize: 80,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  logoEn: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
    letterSpacing: 5,
    textAlign: 'center',
  },
  underline: {
    width: 70,
    height: 3,
    backgroundColor: '#7c3aed',
    borderRadius: 2,
    marginTop: 6,
    marginBottom: 16,
  },
  trophyRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 36,
    alignItems: 'center',
  },
  trophyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  arenaText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
    fontWeight: '600',
  },

  /* Play button */
  playBtn: {
    width: '100%',
    backgroundColor: '#0d0d0d',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  playIcon: {
    color: '#fff',
    fontSize: 28,
  },
  playBtnAr: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 1,
  },
  playBtnEn: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '400',
  },

  /* Grid */
  grid: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginBottom: 30,
  },
  gridBtn: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  gridIcon: { fontSize: 26 },
  gridLabelAr: {
    color: '#111',
    fontSize: 14,
    fontWeight: '800',
  },
  gridLabelEn: {
    color: '#888',
    fontSize: 11,
    fontWeight: '400',
  },

  hint: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12,
    textAlign: 'center',
  },
});
