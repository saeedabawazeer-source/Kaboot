import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const RED = '#C0202A';

export default function SplashScreen({ navigation }) {
  const scale   = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const subOp   = useRef(new Animated.Value(0)).current;
  const barW    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale,   { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
      Animated.timing(subOp, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();

    Animated.timing(barW, {
      toValue: width * 0.6,
      duration: 2400,
      useNativeDriver: false,
    }).start();

    const t = setTimeout(() => navigation.replace('Home'), 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.logo, { transform: [{ scale }], opacity }]}>
        كابوت
      </Animated.Text>

      <Animated.View style={{ opacity: subOp, alignItems: 'center', gap: 2 }}>
        <Text style={styles.logoEn}>Kaboot</Text>
        <View style={styles.underline} />
        <Text style={styles.tagline}>لعبة البلوت العربية</Text>
      </Animated.View>

      {/* Mini preview cards */}
      <Animated.View style={[styles.cards, { opacity: subOp }]}>
        {[['A','♥',true],['J','♠',false],['10','♦',true],['K','♣',false]].map(([v,s,r],i)=>(
          <View key={i} style={styles.miniCard}>
            <Text style={[styles.mVal, { color: r?'#C0202A':'#111' }]}>{v}</Text>
            <Text style={[styles.mSuit,{ color: r?'#C0202A':'#111' }]}>{s}</Text>
          </View>
        ))}
      </Animated.View>

      {/* Loading bar */}
      <Animated.View style={{ opacity: subOp }}>
        <View style={styles.barOuter}>
          <Animated.View style={[styles.barFill, { width: barW }]} />
        </View>
        <Text style={styles.loadText}>جاري التحميل...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: RED,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  logo: {
    fontSize: 90,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.25)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 10,
  },
  logoEn: {
    fontSize: 22,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    letterSpacing: 6,
  },
  underline: {
    width: 80,
    height: 3,
    backgroundColor: '#7c3aed',
    borderRadius: 2,
    marginTop: 4,
  },
  tagline: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    letterSpacing: 2,
    marginTop: 6,
  },
  cards: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 36,
    marginBottom: 8,
  },
  miniCard: {
    width: 48,
    height: 66,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  mVal:  { fontSize: 17, fontWeight: '900' },
  mSuit: { fontSize: 20, fontWeight: '700' },
  barOuter: {
    width: width * 0.6,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 44,
  },
  barFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  loadText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    letterSpacing: 2,
  },
});
