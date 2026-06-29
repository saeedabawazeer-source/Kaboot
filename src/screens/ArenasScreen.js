import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ARENAS, getArena } from '../constants/arenas';

const RED = '#C0202A';

export default function ArenasScreen({ navigation, route }) {
  const trophies = route.params?.trophies || 0;
  const current  = getArena(trophies);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🏆 الساحات</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {ARENAS.map(arena => {
          const locked    = trophies < arena.min;
          const isCurrent = arena.id === current.id;
          const done      = trophies >= arena.max && arena.max !== 9999;

          return (
            <View key={arena.id} style={[styles.arenaCard, locked && { opacity: 0.6 }]}>
              <LinearGradient
                colors={locked ? ['#2a2a2a','#1a1a1a'] : arena.colors}
                style={styles.arenaGrad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                {isCurrent && (
                  <View style={styles.hereBadge}>
                    <Text style={styles.hereTxt}>أنت هنا</Text>
                  </View>
                )}
                <Text style={styles.arenaEmoji}>{arena.icon}</Text>
                <View style={styles.arenaInfo}>
                  <Text style={styles.arenaNameAr}>{arena.nameAr}</Text>
                  <Text style={styles.arenaNameEn}>{arena.nameEn}</Text>
                  <Text style={styles.arenaRange}>{arena.min} – {arena.max === 9999 ? '∞' : arena.max} 🏆</Text>
                </View>
                <Text style={styles.arenaStatus}>
                  {locked ? '🔒' : done ? '✓' : isCurrent ? '▶' : ''}
                </Text>
              </LinearGradient>
            </View>
          );
        })}
        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: RED },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  backTxt: { color: '#fff', fontSize: 24, fontWeight: '300' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  list: { padding: 14, gap: 10 },
  arenaCard: { borderRadius: 18, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 8 },
  arenaGrad: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, position: 'relative' },
  hereBadge: { position: 'absolute', top: 10, right: 10, backgroundColor: '#ffd700', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  hereTxt: { color: '#0d0618', fontSize: 9, fontWeight: '900' },
  arenaEmoji: { fontSize: 36 },
  arenaInfo: { flex: 1 },
  arenaNameAr: { color: '#fff', fontSize: 20, fontWeight: '800' },
  arenaNameEn: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 1 },
  arenaRange:  { color: 'rgba(255,255,255,0.4)',  fontSize: 11, marginTop: 3 },
  arenaStatus: { fontSize: 22, color: '#fff' },
});
