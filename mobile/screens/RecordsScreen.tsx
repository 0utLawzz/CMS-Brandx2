import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, StyleSheet,
  ActivityIndicator, Platform, TouchableOpacity, Modal, Alert,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { useSheet, COL } from '../hooks/useSheet';
import { normalize, toBool } from '../lib/csv';
import { getStatusClass, getStatusStyle, getStageNumber, STAGE_COLORS } from '../lib/status';
import ThumbnailAvatar from '../components/ThumbnailAvatar';
import EditModal from '../components/EditModal';

type SortKey = 'date' | 'name' | 'status' | 'city';

interface RowProps {
  row: string[];
  index: number;
  onEdit: (row: string[]) => void;
  onDelete: (caseNo: string, name: string) => void;
  selected: boolean;
  onToggle: (caseNo: string) => void;
}

function RecordRow({ row, index, onEdit, onDelete, selected, onToggle }: RowProps) {
  const date = row[COL.DATE] || '—';
  const caseNo = row[COL.CASE_NO] || '—';
  const name = row[COL.NAME] || 'Untitled';
  const tmNo = row[COL.NUMBER] || '—';
  const cls = row[COL.CLASS] || '—';
  const status = row[COL.STATUS] || '';
  const subStatus = row[COL.SUB_STATUS] || '';
  const city = row[COL.CITY] || '';

  const stageNum = getStageNumber(status);
  const stageColor = STAGE_COLORS[stageNum] ?? COLORS.gray;
  const subCls = getStatusClass(subStatus);
  const subStyle = getStatusStyle(subCls);

  return (
    <View style={[styles.row, index % 2 === 0 ? styles.rowEven : styles.rowOdd, selected && styles.rowSelected]}>
      <TouchableOpacity style={styles.tickBtn} onPress={() => onToggle(caseNo)} activeOpacity={0.7}>
        <View style={[styles.tick, selected && styles.tickActive]}>
          {selected && <Text style={styles.tickMark}>✓</Text>}
        </View>
      </TouchableOpacity>

      <ThumbnailAvatar name={name} size={36} />

      <View style={styles.rowMain}>
        <View style={styles.rowTopLine}>
          <Text style={styles.rowDate}>{date}</Text>
          <Text style={styles.rowCase}>{caseNo}</Text>
        </View>
        <Text style={styles.rowName} numberOfLines={1}>{name}</Text>
        <View style={styles.rowMeta}>
          <Text style={styles.rowTm}>™ {tmNo}</Text>
          <Text style={styles.rowCls}>CL.{cls}</Text>
          {!!city && <Text style={[styles.cityTag, { borderColor: COLORS.tealLt, color: COLORS.tealLt }]}>{city}</Text>}
        </View>
        <View style={styles.rowBadges}>
          {!!status && (
            <View style={[styles.stageDot, { backgroundColor: stageColor }]}>
              <Text style={styles.stageDotText}>{stageNum > 0 ? `S${stageNum}` : '?'}</Text>
            </View>
          )}
          {!!subStatus && (
            <View style={[styles.subBadge, { borderColor: subStyle.borderColor, backgroundColor: subStyle.backgroundColor }]}>
              <Text style={[styles.subBadgeText, { color: subStyle.textColor }]} numberOfLines={1}>
                {subStatus.toUpperCase().slice(0, 20)}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.rowActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(row)} activeOpacity={0.7}>
          <Text style={styles.actionEdit}>✎</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionDelBtn]}
          onPress={() => onDelete(caseNo, name)}
          activeOpacity={0.7}
        >
          <Text style={styles.actionDel}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function RecordsScreen() {
  const { rows, loading, error, load, deleteRecord, getRow, saveEdit } = useSheet();
  const [filter, setFilter] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [editRow, setEditRow] = useState<string[] | null>(null);

  useEffect(() => {
    if (!rows.length && !loading) load();
  }, []);

  const filtered = filter.trim()
    ? rows.filter((r) => r.some((v) => normalize(v).includes(filter.trim().toLowerCase())))
    : rows;

  const sorted = [...filtered].sort((a, b) => {
    switch (sortKey) {
      case 'name': return (a[COL.NAME] ?? '').localeCompare(b[COL.NAME] ?? '');
      case 'status': return (a[COL.STATUS] ?? '').localeCompare(b[COL.STATUS] ?? '');
      case 'city': return (a[COL.CITY] ?? '').localeCompare(b[COL.CITY] ?? '');
      default: return (a[COL.DATE] ?? '').localeCompare(b[COL.DATE] ?? '');
    }
  });

  const toggleSelect = useCallback((caseNo: string) => {
    setSelectedCases((prev) => {
      const next = new Set(prev);
      next.has(caseNo) ? next.delete(caseNo) : next.add(caseNo);
      return next;
    });
  }, []);

  function handleDelete(caseNo: string, name: string) {
    Alert.alert(
      'DELETE RECORD',
      `Remove "${name}" from this session?\n(Does not affect the Google Sheet.)`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteRecord(caseNo) },
      ]
    );
  }

  const topPad = Platform.OS === 'web' ? 67 : 0;

  const SORT_OPTIONS: { key: SortKey; label: string }[] = [
    { key: 'date', label: 'DATE' },
    { key: 'name', label: 'NAME' },
    { key: 'status', label: 'STATUS' },
    { key: 'city', label: 'CITY' },
  ];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.toolbar}>
        <View style={styles.filterWrap}>
          <TextInput
            style={styles.filterInput}
            placeholder="Filter any field…"
            placeholderTextColor={COLORS.gray}
            value={filter}
            onChangeText={setFilter}
            autoCorrect={false}
            autoCapitalize="none"
          />
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{sorted.length}</Text>
          </View>
        </View>

        <View style={styles.sortRow}>
          <Text style={styles.sortLabel}>SORT:</Text>
          {SORT_OPTIONS.map(({ key, label }) => (
            <TouchableOpacity
              key={key}
              style={[styles.sortBtn, sortKey === key && styles.sortBtnActive]}
              onPress={() => setSortKey(key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.sortBtnText, sortKey === key && styles.sortBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedCases.size > 0 && (
          <View style={styles.selectionBar}>
            <Text style={styles.selectionText}>{selectedCases.size} SELECTED</Text>
            <TouchableOpacity onPress={() => setSelectedCases(new Set())} style={styles.clearSelBtn}>
              <Text style={styles.clearSelText}>CLEAR</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {loading && !rows.length ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.orange} />
          <Text style={styles.loadText}>LOADING RECORDS…</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>⚠ LOAD ERROR</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={load}>
            <Text style={styles.retryText}>↻ RETRY</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item, index }) => (
            <RecordRow
              row={getRow(item)}
              index={index}
              onEdit={(r) => setEditRow(r)}
              onDelete={handleDelete}
              selected={selectedCases.has(item[COL.CASE_NO] ?? '')}
              onToggle={toggleSelect}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={25}
          maxToRenderPerBatch={25}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>NO RECORDS</Text>
              <Text style={styles.emptySub}>{filter ? 'Nothing matches your filter.' : 'Pull to refresh.'}</Text>
            </View>
          }
        />
      )}

      {editRow && (
        <EditModal
          visible
          row={editRow}
          onSave={(edits) => {
            saveEdit(editRow[COL.CASE_NO] ?? '', edits);
            setEditRow(null);
          }}
          onClose={() => setEditRow(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.cream },
  toolbar: { backgroundColor: COLORS.white, borderBottomWidth: 3, borderBottomColor: COLORS.black, padding: 12 },
  filterWrap: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  filterInput: {
    flex: 1, backgroundColor: COLORS.cream, borderWidth: 2, borderColor: COLORS.black,
    borderRadius: 0, paddingHorizontal: 12, paddingVertical: 9,
    fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: COLORS.black,
  },
  countBadge: { backgroundColor: COLORS.black, borderRadius: 4, paddingHorizontal: 12, paddingVertical: 8 },
  countText: { fontFamily: 'BebasNeue_400Regular', fontSize: 18, color: COLORS.orange },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortLabel: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.gray, letterSpacing: 1 },
  sortBtn: {
    borderWidth: 2, borderColor: COLORS.cream2, borderRadius: 4,
    paddingHorizontal: 8, paddingVertical: 3, backgroundColor: COLORS.cream,
  },
  sortBtnActive: { backgroundColor: COLORS.black, borderColor: COLORS.black },
  sortBtnText: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.gray, letterSpacing: 0.5 },
  sortBtnTextActive: { color: COLORS.orange },
  selectionBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginTop: 8, backgroundColor: COLORS.statusRedBg, borderWidth: 2,
    borderColor: COLORS.orange, borderRadius: 4, paddingHorizontal: 10, paddingVertical: 6,
  },
  selectionText: { fontFamily: 'DMMono_500Medium', fontSize: 10, color: COLORS.orange, letterSpacing: 0.5 },
  clearSelBtn: { paddingHorizontal: 8, paddingVertical: 3, backgroundColor: COLORS.orange, borderRadius: 3 },
  clearSelText: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.white, letterSpacing: 0.5 },
  listContent: { paddingBottom: 120 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1.5, borderBottomColor: COLORS.cream2, gap: 10,
  },
  rowEven: { backgroundColor: COLORS.white },
  rowOdd: { backgroundColor: COLORS.cream },
  rowSelected: { backgroundColor: 'rgba(201,74,0,0.07)' },
  tickBtn: { padding: 4 },
  tick: {
    width: 20, height: 20, borderWidth: 2, borderColor: COLORS.cream2,
    borderRadius: 3, alignItems: 'center', justifyContent: 'center',
  },
  tickActive: { backgroundColor: COLORS.tealLt, borderColor: COLORS.tealLt },
  tickMark: { fontFamily: 'DMMono_500Medium', fontSize: 11, color: COLORS.white },
  rowMain: { flex: 1 },
  rowTopLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  rowDate: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.gray, letterSpacing: 0.3 },
  rowCase: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.orange, letterSpacing: 0.3 },
  rowName: { fontFamily: 'SpaceGrotesk_700Bold', fontSize: 13, color: COLORS.black, marginBottom: 3 },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  rowTm: { fontFamily: 'DMMono_500Medium', fontSize: 10, color: COLORS.dim, letterSpacing: 0.5 },
  rowCls: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.gray, borderWidth: 1.5, borderColor: COLORS.cream2, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  cityTag: { fontFamily: 'DMMono_500Medium', fontSize: 8, borderWidth: 1.5, borderRadius: 2, paddingHorizontal: 4, paddingVertical: 1 },
  rowBadges: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  stageDot: { width: 22, height: 22, borderRadius: 3, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: COLORS.black },
  stageDotText: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.white, fontWeight: '700' },
  subBadge: { borderWidth: 1.5, borderRadius: 3, paddingHorizontal: 5, paddingVertical: 2, maxWidth: 130 },
  subBadgeText: { fontFamily: 'DMMono_500Medium', fontSize: 8, letterSpacing: 0.3, textTransform: 'uppercase' },
  rowActions: { flexDirection: 'column', gap: 6 },
  actionBtn: { width: 28, height: 28, borderWidth: 2, borderColor: COLORS.cream2, borderRadius: 4, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.white },
  actionDelBtn: { borderColor: COLORS.statusRed, backgroundColor: COLORS.statusRedBg },
  actionEdit: { fontFamily: 'DMMono_500Medium', fontSize: 13, color: COLORS.orange },
  actionDel: { fontFamily: 'DMMono_500Medium', fontSize: 11, color: COLORS.statusRed },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  loadText: { fontFamily: 'DMMono_500Medium', fontSize: 11, color: COLORS.gray, letterSpacing: 1, marginTop: 12 },
  errorTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: COLORS.orange, letterSpacing: 2, marginBottom: 6 },
  errorSub: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: COLORS.gray, textAlign: 'center', paddingHorizontal: 24, marginBottom: 12 },
  retryBtn: { backgroundColor: COLORS.orange, borderWidth: 2.5, borderColor: COLORS.black, borderRadius: 6, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { fontFamily: 'DMMono_500Medium', fontSize: 11, color: COLORS.white, letterSpacing: 1 },
  emptyTitle: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: COLORS.black, letterSpacing: 2, marginBottom: 4 },
  emptySub: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: COLORS.gray, textAlign: 'center' },
});
