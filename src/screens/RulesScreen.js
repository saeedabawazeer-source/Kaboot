import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar } from 'react-native';

const RED = '#C0202A';

const Sec = ({ title, children }) => (
  <View style={s.sec}>
    <Text style={s.secTitle}>{title}</Text>
    {children}
  </View>
);

export default function RulesScreen({ navigation }) {
  return (
    <View style={s.container}>
      <StatusBar barStyle="light-content" backgroundColor={RED} />
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.back}>
          <Text style={s.backTxt}>‹</Text>
        </TouchableOpacity>
        <Text style={s.title}>📖 قوانين البلوت</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 40 }}>
        <Sec title="🃏 الأساسيات">
          <Text style={s.body}>
            لعبة البلوت: 4 لاعبين في فريقين. أنت وشريكك (شمال) ضد الخصمين (شرق + غرب). تُستخدم 32 ورقة (7 إلى الآس).
          </Text>
        </Sec>

        <Sec title="🎯 التوزيع والمزايدة">
          <Text style={s.body}>
            ١. يُوزَّع 7 ورقات لكل لاعب.{'\n'}
            ٢. تُكشف ورقة في المنتصف — هي الورقة المقترحة.{'\n'}
            ٣. المزايدة بالترتيب:{'\n\n'}
            {'  '}🟡 <Text style={s.bold}>حكم</Text>  — قبول لون الورقة المكشوفة حكماً{'\n'}
            {'  '}🟢 <Text style={s.bold}>سن</Text>   — اللعب بدون حكم (أشكل){'\n'}
            {'  '}🟣 <Text style={s.bold}>أشكل</Text> — اختيار لون حكم مختلف{'\n'}
            {'  '}⚫ <Text style={s.bold}>بس</Text>   — تمرير{'\n\n'}
            ٤. أول من يزايد يُصبح المُعلن ويأخذ الورقة الوسطى.{'\n'}
            ٥. الباقون يأخذون ورقة من الاحتياط. الجميع بيده 8 ورقات.
          </Text>
        </Sec>

        <Sec title="🏅 قيم الأوراق – مع الحكم">
          <View style={s.table}>
            {[['جاك الحكم','20'],['٩ الحكم','14'],['آس','11'],['عشرة','10'],['كينج','4'],['كويين','3'],['جاك (غير حكم)','2'],['٨ – ٧','0']].map(([l,v])=>(
              <View key={l} style={s.row}>
                <Text style={s.rLabel}>{l}</Text>
                <Text style={s.rVal}>{v}</Text>
              </View>
            ))}
          </View>
        </Sec>

        <Sec title="⭐ قيم الأوراق – بدون حكم (سن)">
          <View style={s.table}>
            {[['آس','11'],['عشرة','10'],['كينج','4'],['كويين','3'],['جاك','2'],['٩ – ٨ – ٧','0']].map(([l,v])=>(
              <View key={l} style={s.row}><Text style={s.rLabel}>{l}</Text><Text style={s.rVal}>{v}</Text></View>
            ))}
          </View>
        </Sec>

        <Sec title="📋 قوانين اللعب">
          <Text style={s.body}>
            • يجب اتباع لون الورقة الأولى إن أمكن.{'\n'}
            • في الحكم: إن لم يكن عندك اللون، يجب لعب الحكم.{'\n'}
            • آخر ورقة: بونص +10 للفائز بها.{'\n'}
            • المُعلن يحتاج {'>'} 76 (حكم) أو {'>'} 60 (سن) للفوز.{'\n'}
            • إن فشل المُعلن، الخصوم يأخذون كل النقاط.
          </Text>
        </Sec>

        <Sec title="🏆 كابوت">
          <Text style={s.body}>
            إذا فاز فريق بجميع الأوراق الثماني = كابوت!{'\n'}
            بونص: +100 نقطة + 60 كأس! 🎉
          </Text>
        </Sec>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: RED },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, paddingBottom: 14, paddingHorizontal: 16,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  back: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center' },
  backTxt: { color: '#fff', fontSize: 24, fontWeight: '300' },
  title: { color: '#fff', fontSize: 18, fontWeight: '800' },
  sec: { marginBottom: 22, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 16, padding: 16 },
  secTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 10, letterSpacing: 0.5 },
  body: { color: 'rgba(255,255,255,0.8)', fontSize: 13.5, lineHeight: 24 },
  bold: { fontWeight: '900', color: '#fff' },
  table: { gap: 2 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  rLabel: { color: '#fff', fontSize: 13, fontWeight: '600' },
  rVal:   { color: '#ffd700', fontSize: 13, fontWeight: '800' },
});
