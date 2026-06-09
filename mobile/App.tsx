import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { BebasNeue_400Regular } from '@expo-google-fonts/bebas-neue';
import { SpaceGrotesk_400Regular, SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import { DMMono_500Medium } from '@expo-google-fonts/dm-mono';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { COLORS } from './constants/colors';
import SearchScreen from './screens/SearchScreen';
import RecordsScreen from './screens/RecordsScreen';
import JournalScreen from './screens/JournalScreen';

SplashScreen.preventAutoHideAsync();
const queryClient = new QueryClient();

type Tab = 'search' | 'records' | 'journal';

interface TabDef { id: Tab; label: string; icon: string; }
const TABS: TabDef[] = [
  { id: 'search', label: 'SEARCH', icon: '⌕' },
  { id: 'records', label: 'ALL RECORDS', icon: '≡' },
  { id: 'journal', label: 'JOURNAL', icon: '◎' },
];

function Header() {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === 'web' ? 0 : insets.top;
  return (
    <View style={[styles.header, { paddingTop: topPad + 10 }]}>
      <View style={styles.logoWrap}>
        <View style={styles.logoBox}>
          <Text style={styles.logoB}>B</Text>
          <Text style={styles.logoDot}>.</Text>
        </View>
        <View>
          <Text style={styles.brandName}>BRANDEX LAW</Text>
          <Text style={styles.brandSub}>TRADEMARK PORTAL · PK</Text>
        </View>
      </View>
    </View>
  );
}

function TabBar({ active, onPress }: { active: Tab; onPress: (t: Tab) => void }) {
  const insets = useSafeAreaInsets();
  const bottomPad = Platform.OS === 'web' ? 34 : insets.bottom;
  return (
    <View style={[styles.tabBar, { paddingBottom: bottomPad + 4 }]}>
      {TABS.map(({ id, label, icon }) => {
        const isActive = active === id;
        return (
          <TouchableOpacity
            key={id}
            style={[styles.tabItem, isActive && styles.tabItemActive]}
            onPress={() => onPress(id)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabIcon, isActive && styles.tabIconActive]}>{icon}</Text>
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>{label}</Text>
            {isActive && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>('search');
  const [fontsLoaded, fontError] = useFonts({
    BebasNeue_400Regular,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    DMMono_500Medium,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <Header />
      <View style={styles.screenWrap}>
        {activeTab === 'search' && <SearchScreen />}
        {activeTab === 'records' && <RecordsScreen />}
        {activeTab === 'journal' && <JournalScreen />}
      </View>
      <TabBar active={activeTab} onPress={setActiveTab} />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppShell />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.black },
  header: {
    backgroundColor: COLORS.black,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.orange,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  logoWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    backgroundColor: COLORS.orange, borderWidth: 2.5, borderColor: COLORS.white,
    borderRadius: 4, width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', shadowColor: COLORS.orange, shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1, shadowRadius: 0, elevation: 4,
  },
  logoB: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: COLORS.white, lineHeight: 28 },
  logoDot: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: COLORS.tealLt, lineHeight: 28 },
  brandName: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: COLORS.white, letterSpacing: 2, lineHeight: 24 },
  brandSub: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.tealLt, letterSpacing: 1.5 },
  screenWrap: { flex: 1, backgroundColor: COLORS.cream },
  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.black,
    borderTopWidth: 3, borderTopColor: COLORS.orange,
    paddingTop: 10, paddingHorizontal: 8, gap: 4,
  },
  tabItem: {
    flex: 1, alignItems: 'center', paddingVertical: 6,
    borderWidth: 2, borderColor: 'transparent', borderRadius: 4,
  },
  tabItemActive: { backgroundColor: 'rgba(201,74,0,0.15)', borderColor: COLORS.orange },
  tabIcon: { fontSize: 16, color: COLORS.gray, marginBottom: 2 },
  tabIconActive: { color: COLORS.orange },
  tabLabel: { fontFamily: 'DMMono_500Medium', fontSize: 8, color: COLORS.gray, letterSpacing: 0.8 },
  tabLabelActive: { color: COLORS.orange },
  tabIndicator: { position: 'absolute', bottom: -8, width: 20, height: 2, backgroundColor: COLORS.orange },
});
