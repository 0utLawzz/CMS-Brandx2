import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/colors';
import { COL, useSheet } from '../hooks/useSheet';
import { toBool } from '../lib/csv';
import { getStatusClass, getStatusStyle, getStageNumber, STAGE_COLORS } from '../lib/status';
import BoolIndicator from './BoolIndicator';
import ThumbnailAvatar from './ThumbnailAvatar';
import EditModal from './EditModal';

interface Props {
  row: string[];
  headers: string[];
}

export default function TrademarkCard({ row, headers }: Props) {
  const { saveEdit } = useSheet();
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const date = row[COL.DATE] || '';
  const caseNo = row[COL.CASE_NO] || '—';
  const name = row[COL.NAME] || 'Untitled Mark';
  const tmNo = row[COL.NUMBER] || '—';
  const cls = row[COL.CLASS] || '';
  const status = row[COL.STATUS] || '';
  const subStatus = row[COL.SUB_STATUS] || '';
  const city = row[COL.CITY] || '';
  const isDuplicate = toBool(row[COL.DUPLICATE]);
  const isTm11 = toBool(row[COL.TM11]);

  const stageNum = getStageNumber(status);
  const stageColor = STAGE_COLORS[stageNum] ?? COLORS.gray;
  const subCls = getStatusClass(subStatus);
  const subStyle = getStatusStyle(subCls);

  return (
    <>
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.date}>{date}</Text>
          {!!city && <Text style={styles.cityTag}>{city.toUpperCase()}</Text>}
        </View>

        <View style={styles.mainRow}>
          <ThumbnailAvatar name={name} size={48} />
          <View style={styles.mainInfo}>
            <Text style={styles.name} numberOfLines={2}>{name}</Text>
            <View style={styles.tmRow}>
              <Text style={styles.tmLabel}>™ </Text>
              <Text style={styles.tmNo}>{tmNo}</Text>
              {!!cls && <Text style={styles.clsBadge}>CLASS {cls}</Text>}
            </View>
          </View>
          <View style={styles.stagePill}>
            <Text style={[styles.stageText, { color: stageColor }]}>
              {stageNum > 0 ? `S${stageNum}` : '?'}
            </Text>
          </View>
        </View>

        {!!status && (
          <View style={[styles.statusRow, { borderLeftColor: stageColor }]}>
            <Text style={[styles.statusLabel, { color: stageColor }]}>{status.toUpperCase()}</Text>
          </View>
        )}

        {!!subStatus && (
          <View style={[styles.subStatusWrap, { backgroundColor: subStyle.backgroundColor, borderColor: subStyle.borderColor }]}>
            <Text style={[styles.subStatusText, { color: subStyle.textColor }]}>{subStatus.toUpperCase()}</Text>
          </View>
        )}

        <View style={styles.indicators}>
          <BoolIndicator label="Duplicate" value={isDuplicate} type="warning" />
          <View style={{ width: 8 }} />
          <BoolIndicator label="TM-11" value={isTm11} type="positive" />
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.expandBtn} onPress={() => setExpanded((e) => !e)} activeOpacity={0.7}>
            <Text style={styles.expandBtnText}>{expanded ? '▲ HIDE' : '▼ ALL FIELDS'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditOpen(true)} activeOpacity={0.7}>
            <Text style={styles.editBtnText}>✎ EDIT</Text>
          </TouchableOpacity>
        </View>

        {expanded && (
          <View style={styles.kv}>
            {headers.map((h, i) => {
              const val = (row[i] ?? '').trim();
              return (
                <View key={i} style={[styles.kvRow, i % 2 === 0 ? styles.kvEven : styles.kvOdd]}>
                  <Text style={styles.kvKey} numberOfLines={1}>{h.toUpperCase()}</Text>
                  <Text style={styles.kvVal} numberOfLines={2}>{val || '—'}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      <EditModal
        visible={editOpen}
        row={row}
        onSave={(edits) => saveEdit(row[COL.CASE_NO] ?? '', edits)}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: COLORS.black,
    borderRadius: 6,
    padding: 14,
    marginBottom: 14,
    shadowColor: COLORS.black,
    shadowOffset: { width: 5, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  date: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 10,
    color: COLORS.gray,
    letterSpacing: 0.3,
  },
  cityTag: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 9,
    color: COLORS.tealLt,
    borderWidth: 1.5,
    borderColor: COLORS.tealLt,
    borderRadius: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    backgroundColor: COLORS.statusGreenBg,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 10,
  },
  mainInfo: {
    flex: 1,
  },
  name: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 26,
    color: COLORS.black,
    lineHeight: 30,
    marginBottom: 4,
  },
  tmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  tmLabel: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 14,
    color: COLORS.orange,
  },
  tmNo: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 13,
    color: COLORS.black,
    letterSpacing: 1,
  },
  clsBadge: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 9,
    color: COLORS.gray,
    borderWidth: 1.5,
    borderColor: COLORS.cream2,
    borderRadius: 3,
    paddingHorizontal: 4,
    paddingVertical: 1,
    backgroundColor: COLORS.cream,
    textTransform: 'uppercase',
  },
  stagePill: {
    width: 34,
    height: 34,
    borderWidth: 2.5,
    borderColor: COLORS.black,
    borderRadius: 4,
    backgroundColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageText: {
    fontFamily: 'BebasNeue_400Regular',
    fontSize: 18,
    letterSpacing: 1,
  },
  statusRow: {
    borderLeftWidth: 3,
    paddingLeft: 8,
    marginBottom: 8,
  },
  statusLabel: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  subStatusWrap: {
    borderWidth: 2,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  subStatusText: {
    fontFamily: 'SpaceGrotesk_700Bold',
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  indicators: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1.5,
    borderTopColor: COLORS.cream2,
    paddingTop: 8,
  },
  expandBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
    borderWidth: 2,
    borderColor: COLORS.cream2,
    borderRadius: 4,
  },
  expandBtnText: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 9,
    color: COLORS.dim,
    letterSpacing: 0.8,
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    backgroundColor: COLORS.orange,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: 4,
    shadowColor: COLORS.black,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 2,
  },
  editBtnText: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 9,
    color: COLORS.white,
    letterSpacing: 0.8,
  },
  kv: {
    marginTop: 10,
    borderWidth: 2,
    borderColor: COLORS.black,
    borderRadius: 4,
    overflow: 'hidden',
  },
  kvRow: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cream2,
  },
  kvEven: { backgroundColor: COLORS.cream },
  kvOdd: { backgroundColor: COLORS.white },
  kvKey: {
    fontFamily: 'DMMono_500Medium',
    fontSize: 9,
    color: COLORS.gray,
    width: 90,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  kvVal: {
    fontFamily: 'SpaceGrotesk_400Regular',
    fontSize: 12,
    color: COLORS.dim,
    flex: 1,
  },
});
