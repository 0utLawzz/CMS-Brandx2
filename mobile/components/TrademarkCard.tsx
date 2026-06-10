import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { COLORS } from '../constants/colors';
import { COL, useSheet } from '../hooks/useSheet';
import { getStatusClass, getStatusStyle, getStageNumber, STAGE_COLORS, getRunStyle } from '../lib/status';
import EditModal from './EditModal';

interface Props {
  row: string[];
  headers: string[];
}

function driveThumb(fileId: string) {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w120`;
}

function avatarInitials(name: string): string {
  const clean = (name || 'TM').replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = clean.split(/\s+/).filter(Boolean);
  return words.slice(0, 2).map((w) => w[0].toUpperCase()).join('') || 'TM';
}

const AV_COLORS = ['#C94A00', '#0A6B52', '#D4A800', '#0D9970', '#8B2FC9', '#2563EB', '#DC2626'];
function hashColor(name: string) {
  let h = 0;
  for (const c of name) { h = ((h << 5) - h) + c.charCodeAt(0); h |= 0; }
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}

export default function TrademarkCard({ row, headers }: Props) {
  const { saveEdit } = useSheet();
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const srNo      = row[COL.SR_NO]      || '—';
  const tmNo      = row[COL.TM_NO]      || '—';
  const appName   = row[COL.APP_NAME]   || 'Untitled Mark';
  const stage     = row[COL.STAGE]      || '';
  const statusRun = row[COL.STATUS_RUN] || '';
  const appType   = row[COL.APP_TYPE]   || '';
  const cls       = row[COL.CLASS]      || '';
  const classDesc = row[COL.CLASS_DESC] || '';
  const appCnic   = row[COL.APP_CNIC]   || '';
  const appTrade  = row[COL.APP_TRADE]  || '';
  const conName   = row[COL.CON_NAME]   || '';
  const issueDate = row[COL.ISSUE_DATE] || '';
  const imgId     = row[COL.IMG]        || '';
  const noImg     = row[COL.NO_IMG]     || '';
  const year      = row[COL.YEAR]       || '';

  const stageNum   = getStageNumber(stage);
  const stageColor = STAGE_COLORS[stageNum] ?? COLORS.gray;
  const stageCls   = getStatusClass(stage);
  const stageStyle = getStatusStyle(stageCls);
  const runStyle   = getRunStyle(statusRun);
  const initials   = avatarInitials(appName);
  const avColor    = hashColor(appName);

  return (
    <>
      <View style={styles.card}>

        {/* TOP ROW */}
        <View style={styles.topRow}>
          <Text style={styles.srNo}>{srNo}</Text>
          <View style={styles.badges}>
            {!!year && <Text style={styles.yearBadge}>{year}</Text>}
            {!!statusRun && (
              <View style={[styles.runBadge, { backgroundColor: runStyle.bg, borderColor: runStyle.color }]}>
                <Text style={[styles.runText, { color: runStyle.color }]}>{statusRun.toUpperCase()}</Text>
              </View>
            )}
          </View>
        </View>

        {/* MAIN ROW */}
        <View style={styles.mainRow}>
          {imgId ? (
            <Image
              source={{ uri: driveThumb(imgId) }}
              style={styles.thumb}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.avatar, { backgroundColor: avColor }]}>
              <Text style={styles.avatarText}>{initials}</Text>
              {!!noImg && <Text style={styles.noImgLabel}>{noImg.slice(0, 8)}</Text>}
            </View>
          )}
          <View style={styles.mainInfo}>
            <Text style={styles.name} numberOfLines={2}>{appName}</Text>
            <View style={styles.tmRow}>
              <Text style={styles.tmSymbol}>™ </Text>
              <Text style={styles.tmNo}>{tmNo}</Text>
              {!!cls && <Text style={styles.clsBadge}>CL {cls}</Text>}
              {!!appType && <Text style={styles.typeBadge}>{appType}</Text>}
            </View>
            {!!appTrade && <Text style={styles.tradeName} numberOfLines={1}>{appTrade}</Text>}
          </View>
          <View style={[styles.stagePill, { borderColor: stageColor }]}>
            <Text style={[styles.stageNum, { color: stageColor }]}>
              {stageNum > 0 ? `S${stageNum}` : '?'}
            </Text>
          </View>
        </View>

        {/* STAGE BAR */}
        {!!stage && (
          <View style={[styles.stageBar, { borderLeftColor: stageColor }]}>
            <Text style={[styles.stageLabel, { color: stageColor }]}>{stage.toUpperCase()}</Text>
          </View>
        )}

        {/* DETAILS ROW */}
        <View style={styles.detailRow}>
          {!!conName && (
            <View style={styles.detailChip}>
              <Text style={styles.detailKey}>CON</Text>
              <Text style={styles.detailVal} numberOfLines={1}>{conName}</Text>
            </View>
          )}
          {!!appCnic && (
            <View style={styles.detailChip}>
              <Text style={styles.detailKey}>CNIC</Text>
              <Text style={styles.detailVal}>{appCnic}</Text>
            </View>
          )}
          {!!issueDate && (
            <View style={styles.detailChip}>
              <Text style={styles.detailKey}>ISSUED</Text>
              <Text style={styles.detailVal}>{issueDate}</Text>
            </View>
          )}
        </View>

        {/* CLASS DESC */}
        {!!classDesc && (
          <Text style={styles.classDesc} numberOfLines={2}>{classDesc}</Text>
        )}

        {/* ACTIONS */}
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.expandBtn} onPress={() => setExpanded((e) => !e)} activeOpacity={0.7}>
            <Text style={styles.expandBtnText}>{expanded ? '▲ HIDE' : '▼ ALL FIELDS'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.editBtn} onPress={() => setEditOpen(true)} activeOpacity={0.7}>
            <Text style={styles.editBtnText}>✎ EDIT</Text>
          </TouchableOpacity>
        </View>

        {/* ALL FIELDS EXPANDED */}
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
        onSave={(edits) => saveEdit(row[COL.SR_NO] ?? '', edits)}
        onClose={() => setEditOpen(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white, borderWidth: 3, borderColor: COLORS.black,
    borderRadius: 6, padding: 14, marginBottom: 14,
    shadowColor: COLORS.black, shadowOffset: { width: 5, height: 5 }, shadowOpacity: 1, shadowRadius: 0, elevation: 6,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  srNo: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.gray, letterSpacing: 0.5 },
  badges: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  yearBadge: {
    fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.dim,
    borderWidth: 1.5, borderColor: COLORS.cream2, borderRadius: 3,
    paddingHorizontal: 5, paddingVertical: 1, backgroundColor: COLORS.cream,
  },
  runBadge: {
    borderWidth: 1.5, borderRadius: 3, paddingHorizontal: 6, paddingVertical: 2,
  },
  runText: { fontFamily: 'DMMono_500Medium', fontSize: 8, letterSpacing: 0.5 },
  mainRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  thumb: { width: 52, height: 52, borderWidth: 2, borderColor: COLORS.black, borderRadius: 4, backgroundColor: COLORS.cream },
  avatar: { width: 52, height: 52, borderRadius: 4, borderWidth: 2, borderColor: COLORS.black, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'BebasNeue_400Regular', fontSize: 18, color: COLORS.white },
  noImgLabel: { fontFamily: 'DMMono_500Medium', fontSize: 5, color: 'rgba(255,255,255,0.7)', letterSpacing: 0 },
  mainInfo: { flex: 1 },
  name: { fontFamily: 'BebasNeue_400Regular', fontSize: 24, color: COLORS.black, lineHeight: 28, marginBottom: 4 },
  tmRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginBottom: 3 },
  tmSymbol: { fontFamily: 'DMMono_500Medium', fontSize: 14, color: COLORS.orange },
  tmNo: { fontFamily: 'DMMono_500Medium', fontSize: 12, color: COLORS.black, letterSpacing: 1 },
  clsBadge: {
    fontFamily: 'DMMono_500Medium', fontSize: 8, color: COLORS.gray,
    borderWidth: 1.5, borderColor: COLORS.cream2, borderRadius: 3,
    paddingHorizontal: 4, paddingVertical: 1, backgroundColor: COLORS.cream,
  },
  typeBadge: {
    fontFamily: 'DMMono_500Medium', fontSize: 8, color: COLORS.teal,
    borderWidth: 1.5, borderColor: COLORS.teal, borderRadius: 3,
    paddingHorizontal: 4, paddingVertical: 1, backgroundColor: 'rgba(10,107,82,0.06)',
  },
  tradeName: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: COLORS.dim, fontStyle: 'italic' },
  stagePill: {
    width: 36, height: 36, borderWidth: 2.5, borderRadius: 4,
    backgroundColor: COLORS.black, alignItems: 'center', justifyContent: 'center',
  },
  stageNum: { fontFamily: 'BebasNeue_400Regular', fontSize: 18, letterSpacing: 1 },
  stageBar: { borderLeftWidth: 3, paddingLeft: 8, marginBottom: 8 },
  stageLabel: { fontFamily: 'DMMono_500Medium', fontSize: 10, letterSpacing: 1 },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  detailChip: {
    flexDirection: 'row', gap: 4, alignItems: 'center',
    backgroundColor: COLORS.cream, borderWidth: 1.5, borderColor: COLORS.cream2,
    borderRadius: 3, paddingHorizontal: 6, paddingVertical: 3,
  },
  detailKey: { fontFamily: 'DMMono_500Medium', fontSize: 8, color: COLORS.gray, letterSpacing: 0.5 },
  detailVal: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 10, color: COLORS.dim, maxWidth: 120 },
  classDesc: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 11, color: COLORS.dim, lineHeight: 16, marginBottom: 8, paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: COLORS.cream2 },
  cardActions: { flexDirection: 'row', gap: 8, borderTopWidth: 1.5, borderTopColor: COLORS.cream2, paddingTop: 8 },
  expandBtn: { flex: 1, alignItems: 'center', paddingVertical: 5, borderWidth: 2, borderColor: COLORS.cream2, borderRadius: 4 },
  expandBtnText: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.dim, letterSpacing: 0.8 },
  editBtn: { paddingHorizontal: 14, paddingVertical: 5, backgroundColor: COLORS.orange, borderWidth: 2, borderColor: COLORS.black, borderRadius: 4, shadowColor: COLORS.black, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 1, shadowRadius: 0, elevation: 2 },
  editBtnText: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.white, letterSpacing: 0.8 },
  kv: { marginTop: 10, borderWidth: 2, borderColor: COLORS.black, borderRadius: 4, overflow: 'hidden' },
  kvRow: { flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: COLORS.cream2 },
  kvEven: { backgroundColor: COLORS.cream },
  kvOdd: { backgroundColor: COLORS.white },
  kvKey: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.gray, width: 90, letterSpacing: 0.3 },
  kvVal: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 12, color: COLORS.dim, flex: 1 },
});
