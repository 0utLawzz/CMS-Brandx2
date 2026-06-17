import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Keyboard, Platform,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { useSheet } from '../hooks/useSheet';
import StatTile from '../components/StatTile';
import TrademarkCard from '../components/TrademarkCard';
import StageChart from '../components/StageChart';

const STAT_CONFIG = [
  { key: 'total' as const, label: 'TOTAL', accent: COLORS.black },
  { key: 'examination' as const, label: 'EXAM', accent: COLORS.yellow },
  { key: 'accepted' as const, label: 'ACCEPTED', accent: COLORS.tealLt },
  { key: 'demandNote' as const, label: 'D-NOTE', accent: COLORS.orange },
  { key: 'demandNotePaid' as const, label: 'PAID', accent: COLORS.teal },
  { key: 'certificate' as const, label: 'CERT', accent: '#8B2FC9' },
];

export default function SearchScreen() {
  const { headers, rows, stats, loading, error, load, search, getRow } = useSheet();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<string[][]>([]);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => { load(); }, []);

  function doSearch(q: string) {
    const trimmed = q.trim();
    if (!trimmed) { setResults([]); setSearched(false); return; }
    setResults(search(trimmed));
    setSearched(true);
    Keyboard.dismiss();
  }

  function clearSearch() {
    setQuery(''); setResults([]); setSearched(false);
    inputRef.current?.focus();
  }

  const topPad = Platform.OS === 'web' ? 67 : 0;

  const ListHeader = (
    <View>
      <StageChart stages={stats.stages} total={stats.total} />

      <View style={styles.statsGrid}>
        {STAT_CONFIG.map(({ key, label, accent }) => (
          <StatTile key={key} value={stats[key]} label={label} accent={accent} />
        ))}
      </View>

      <View style={styles.searchCard}>
        <Text style={styles.searchEyebrow}>APPLICATION LOOKUP</Text>
        <View style={styles.searchRow}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="App number, TM No or mark name…"
            placeholderTextColor={COLORS.gray}
            value={query}
            onChangeText={(t) => { setQuery(t); if (!t.trim()) { setResults([]); setSearched(false); } }}
            onSubmitEditing={() => doSearch(query)}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearSearch} activeOpacity={0.7}>
              <Text style={styles.clearText}>✕</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.searchBtn} onPress={() => doSearch(query)} activeOpacity={0.8}>
            <Text style={styles.searchBtnText}>SEARCH</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.statusRow}>
          {loading ? (
            <View style={styles.statusChip}>
              <ActivityIndicator size="small" color={COLORS.orange} />
              <Text style={styles.statusText}>Loading…</Text>
            </View>
          ) : error ? (
            <View style={[styles.statusChip, styles.statusError]}>
              <Text style={[styles.statusText, { color: COLORS.orange }]}>Error: {error}</Text>
            </View>
          ) : (
            <View style={[styles.statusChip, styles.statusOk]}>
              <View style={[styles.dot, { backgroundColor: COLORS.tealLt }]} />
              <Text style={styles.statusText}>{rows.length} records ready</Text>
            </View>
          )}
          <TouchableOpacity style={styles.refreshBtn} onPress={load} activeOpacity={0.8}>
            <Text style={styles.refreshText}>↻ REFRESH</Text>
          </TouchableOpacity>
        </View>
      </View>

      {searched && (
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>SEARCH RESULTS</Text>
          <Text style={styles.resultsCount}>{results.length} {results.length === 1 ? 'MATCH' : 'MATCHES'}</Text>
        </View>
      )}

      {searched && results.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>NO MATCHES</Text>
          <Text style={styles.emptyHint}>Nothing found for "{query}".</Text>
        </View>
      )}

      {!searched && (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>START SEARCHING</Text>
          <Text style={styles.emptyHint}>Enter an application number, TM No or mark name.</Text>
        </View>
      )}
    </View>
  );

  return (
    <FlatList
      data={searched ? results : []}
      keyExtractor={(_, i) => String(i)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.content, { paddingTop: topPad }]}
      ListHeaderComponent={ListHeader}
      renderItem={({ item }) => <TrademarkCard row={getRow(item)} headers={headers} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, paddingBottom: 100, backgroundColor: COLORS.cream, flexGrow: 1 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  searchCard: {
    backgroundColor: COLORS.white, borderWidth: 3, borderColor: COLORS.black,
    borderRadius: 6, padding: 14, marginBottom: 16,
    shadowColor: COLORS.black, shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6,
  },
  searchEyebrow: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.gray, letterSpacing: 1.5, marginBottom: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  input: {
    flex: 1, backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.black,
    borderRadius: 0, paddingHorizontal: 12, paddingVertical: 10,
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: COLORS.black,
  },
  clearBtn: { padding: 10 },
  clearText: { color: COLORS.gray, fontSize: 14, fontFamily: 'SpaceGrotesk_400Regular' },
  searchBtn: {
    backgroundColor: COLORS.orange, borderWidth: 2.5, borderColor: COLORS.black, borderRadius: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    shadowColor: COLORS.black, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 4,
  },
  searchBtnText: { fontFamily: 'DMMono_500Medium', fontSize: 11, color: COLORS.white, letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 2, borderColor: COLORS.black, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 4, backgroundColor: COLORS.cream,
  },
  statusOk: { backgroundColor: COLORS.statusGreenBg, borderColor: COLORS.tealLt },
  statusError: { backgroundColor: COLORS.statusRedBg, borderColor: COLORS.orange },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontFamily: 'DMMono_500Medium', fontSize: 10, color: COLORS.dim, letterSpacing: 0.3 },
  refreshBtn: {
    backgroundColor: COLORS.white, borderWidth: 2.5, borderColor: COLORS.black,
    borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6,
    shadowColor: COLORS.black, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3,
  },
  refreshText: { fontFamily: 'DMMono_500Medium', fontSize: 10, color: COLORS.black, letterSpacing: 0.5 },
  resultsHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: 12, paddingBottom: 8, borderBottomWidth: 2.5, borderBottomColor: COLORS.black,
  },
  resultsTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: COLORS.black, letterSpacing: 1 },
  resultsCount: { fontFamily: 'DMMono_500Medium', fontSize: 11, color: COLORS.orange, letterSpacing: 0.5 },
  empty: {
    alignItems: 'center', paddingVertical: 36, backgroundColor: COLORS.white,
    borderWidth: 2.5, borderColor: COLORS.black, borderRadius: 6,
    shadowColor: COLORS.black, shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0, elevation: 5,
  },
  emptyTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: COLORS.black, letterSpacing: 2, marginBottom: 4 },
  emptyHint: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: COLORS.gray, textAlign: 'center', paddingHorizontal: 24 },
});
