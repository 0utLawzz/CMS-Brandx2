import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { COL, ColKey } from '../hooks/useSheet';
import {
  STATUS_RUN_LIST, STAGE_LIST, APP_TYPE_LIST, CLASS_LIST, YEAR_LIST,
  formatCNIC,
} from '../lib/status';

interface PickerModalProps {
  visible: boolean;
  title: string;
  items: string[];
  selected: string;
  onSelect: (val: string) => void;
  onClose: () => void;
}

function PickerModal({ visible, title, items, selected, onSelect, onClose }: PickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={ps.overlay}>
        <View style={ps.sheet}>
          <View style={ps.header}>
            <Text style={ps.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={ps.closeBtn}>
              <Text style={ps.closeText}>✕</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={items}
            keyExtractor={(i) => i}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[ps.item, item === selected && ps.itemActive]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={[ps.itemText, item === selected && ps.itemTextActive]}>{item}</Text>
                {item === selected && <Text style={ps.check}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

interface Props {
  visible: boolean;
  row: string[];
  onSave: (edits: Partial<Record<ColKey, string>>) => void;
  onClose: () => void;
}

function autoExpiry(issueDate: string): string {
  const d = new Date(issueDate);
  if (isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + 7);
  const M = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${String(d.getDate()).padStart(2,'0')}-${M[d.getMonth()]}-${d.getFullYear()}`;
}

export default function EditModal({ visible, row, onSave, onClose }: Props) {
  const [statusRun,  setStatusRun]  = useState(row[COL.STATUS_RUN]  ?? '');
  const [stage,      setStage]      = useState(row[COL.STAGE]       ?? '');
  const [srNo,       setSrNo]       = useState(row[COL.SR_NO]       ?? '');
  const [tmNo,       setTmNo]       = useState(row[COL.TM_NO]       ?? '');
  const [folder,     setFolder]     = useState(row[COL.FOLDER]      ?? '');
  const [dateL,      setDateL]      = useState(row[COL.DATE_L]      ?? '');
  const [cls,        setCls]        = useState(row[COL.CLASS]       ?? '');
  const [classDesc,  setClassDesc]  = useState(row[COL.CLASS_DESC]  ?? '');
  const [appType,    setAppType]    = useState(row[COL.APP_TYPE]    ?? '');
  const [appName,    setAppName]    = useState(row[COL.APP_NAME]    ?? '');
  const [appSo,      setAppSo]      = useState(row[COL.APP_SO]      ?? '');
  const [appCnic,    setAppCnic]    = useState(row[COL.APP_CNIC]    ?? '');
  const [issueDate,  setIssueDate]  = useState(row[COL.ISSUE_DATE]  ?? '');
  const [expiryDate, setExpiryDate] = useState(row[COL.EXPIRY_DATE] ?? '');
  const [appTrade,   setAppTrade]   = useState(row[COL.APP_TRADE]   ?? '');
  const [appAdd,     setAppAdd]     = useState(row[COL.APP_ADD]     ?? '');
  const [year,       setYear]       = useState(row[COL.YEAR]        ?? '');
  const [conName,    setConName]    = useState(row[COL.CON_NAME]    ?? '');
  const [conAdd,     setConAdd]     = useState(row[COL.CON_ADD]     ?? '');
  const [img,        setImg]        = useState(row[COL.IMG]         ?? '');
  const [noImg,      setNoImg]      = useState(row[COL.NO_IMG]      ?? '');

  const [runPicker,   setRunPicker]   = useState(false);
  const [stagePicker, setStagePicker] = useState(false);
  const [typePicker,  setTypePicker]  = useState(false);
  const [classPicker, setClassPicker] = useState(false);
  const [yearPicker,  setYearPicker]  = useState(false);

  useEffect(() => {
    if (issueDate) {
      const auto = autoExpiry(issueDate);
      if (auto) setExpiryDate(auto);
    }
  }, [issueDate]);

  function handleCnicChange(val: string) {
    setAppCnic(formatCNIC(val));
  }

  function handleSave() {
    onSave({
      STATUS_RUN: statusRun, STAGE: stage, SR_NO: srNo, TM_NO: tmNo,
      FOLDER: folder, DATE_L: dateL, CLASS: cls, CLASS_DESC: classDesc,
      APP_TYPE: appType, APP_NAME: appName, APP_SO: appSo, APP_CNIC: appCnic,
      ISSUE_DATE: issueDate, EXPIRY_DATE: expiryDate,
      APP_TRADE: appTrade, APP_ADD: appAdd, YEAR: year,
      CON_NAME: conName, CON_ADD: conAdd, IMG: img, NO_IMG: noImg,
    });
    onClose();
  }

  const SectionLabel = ({ label }: { label: string }) => (
    <Text style={styles.section}>{label}</Text>
  );

  const Field = ({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) => (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>
        {label}{req ? <Text style={styles.req}> ⭐</Text> : ''}
      </Text>
      {children}
    </View>
  );

  const PickerField = ({ label, value, placeholder, onPress, req }: {
    label: string; value: string; placeholder: string; onPress: () => void; req?: boolean;
  }) => (
    <Field label={label} req={req}>
      <TouchableOpacity style={styles.picker} onPress={onPress}>
        <Text style={value ? styles.pickerValue : styles.pickerPlaceholder} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Text style={styles.pickerArrow}>▼</Text>
      </TouchableOpacity>
    </Field>
  );

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>EDIT RECORD</Text>
              <Text style={styles.subtitle}>{srNo || row[COL.SR_NO] || ''}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">

              <SectionLabel label="A–B · STATUS & STAGE" />
              <PickerField label="A · STATUS" value={statusRun} placeholder="Run / Processing / Done" onPress={() => setRunPicker(true)} req />
              <PickerField label="B · STAGE"  value={stage}     placeholder="STAGE 1–4 / STOPPED"     onPress={() => setStagePicker(true)} req />

              <SectionLabel label="C–F · IDENTITY & DATE" />
              <Field label="C · SERIAL NO">
                <TextInput style={styles.input} value={srNo} onChangeText={setSrNo} placeholder="PB-RWP-…" placeholderTextColor={COLORS.gray} />
              </Field>
              <Field label="D · TM NUMBER">
                <TextInput style={styles.input} value={tmNo} onChangeText={setTmNo} placeholder="Trademark number" placeholderTextColor={COLORS.gray} />
              </Field>
              <Field label="E · FOLDER NAME" req>
                <TextInput style={styles.input} value={folder} onChangeText={setFolder} placeholder="Drive folder name" placeholderTextColor={COLORS.gray} />
              </Field>
              <Field label="F · DATE (LONG)">
                <TextInput style={styles.input} value={dateL} onChangeText={setDateL} placeholder="01-MAY-2026" placeholderTextColor={COLORS.gray} />
              </Field>

              <SectionLabel label="G–H · CLASS" />
              <PickerField label="G · CLASS (01–45)" value={cls} placeholder="Select class" onPress={() => setClassPicker(true)} req />
              <Field label="H · CLASS DESCRIPTION">
                <TextInput style={styles.input} value={classDesc} onChangeText={setClassDesc} placeholder="Goods & services description" placeholderTextColor={COLORS.gray} />
              </Field>

              <SectionLabel label="I–L · APPLICANT" />
              <PickerField label="I · APP TYPE" value={appType} placeholder="SOLE / PARTNER / COMPANY" onPress={() => setTypePicker(true)} req />
              <Field label="J · APP NAME" req>
                <TextInput style={styles.input} value={appName} onChangeText={setAppName} placeholder="Applicant full name" placeholderTextColor={COLORS.gray} />
              </Field>
              <Field label="K · FATHER'S NAME (S/O)">
                <TextInput style={styles.input} value={appSo} onChangeText={setAppSo} placeholder="Father's name" placeholderTextColor={COLORS.gray} />
              </Field>
              <Field label="L · APP CNIC" req>
                <TextInput
                  style={styles.input} value={appCnic}
                  onChangeText={handleCnicChange}
                  placeholder="XXXXX-XXXXXXX-X"
                  placeholderTextColor={COLORS.gray}
                  keyboardType="numeric" maxLength={15}
                />
              </Field>

              <SectionLabel label="M–N · DATES" />
              <Field label="M · ISSUE DATE">
                <TextInput style={styles.input} value={issueDate} onChangeText={setIssueDate} placeholder="01-MAY-2026" placeholderTextColor={COLORS.gray} />
              </Field>
              <Field label="N · EXPIRY DATE (auto +7 days)">
                <View style={[styles.input, styles.readOnly]}>
                  <Text style={{ fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: expiryDate ? COLORS.black : COLORS.gray }}>
                    {expiryDate || 'Auto from Issue Date'}
                  </Text>
                </View>
              </Field>

              <SectionLabel label="O–Q · TRADE & ADDRESS" />
              <Field label="O · BUSINESS / TRADE NAME" req>
                <TextInput style={styles.input} value={appTrade} onChangeText={setAppTrade} placeholder="Registered brand name" placeholderTextColor={COLORS.gray} />
              </Field>
              <Field label="P · APPLICANT ADDRESS" req>
                <TextInput style={[styles.input, styles.multi]} value={appAdd} onChangeText={setAppAdd} placeholder="Full address" placeholderTextColor={COLORS.gray} multiline numberOfLines={3} />
              </Field>
              <PickerField label="Q · YEAR" value={year} placeholder="2022–2026" onPress={() => setYearPicker(true)} />

              <SectionLabel label="R–S · CONSULTANT" />
              <Field label="R · CONSULTANT NAME" req>
                <TextInput style={styles.input} value={conName} onChangeText={setConName} placeholder="Consultant full name" placeholderTextColor={COLORS.gray} />
              </Field>
              <Field label="S · CONSULTANT ADDRESS" req>
                <TextInput style={[styles.input, styles.multi]} value={conAdd} onChangeText={setConAdd} placeholder="Consultant address" placeholderTextColor={COLORS.gray} multiline numberOfLines={3} />
              </Field>

              <SectionLabel label="T–U · IMAGE" />
              <Field label="T · GOOGLE DRIVE IMAGE ID">
                <TextInput style={styles.input} value={img} onChangeText={setImg} placeholder="Drive file ID" placeholderTextColor={COLORS.gray} autoCapitalize="none" />
              </Field>
              <Field label="U · FALLBACK TEXT (NO IMAGE)">
                <TextInput style={styles.input} value={noImg} onChangeText={setNoImg} placeholder="e.g. WORDMARK" placeholderTextColor={COLORS.gray} />
              </Field>

              <View style={styles.actions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                  <Text style={styles.cancelText}>CANCEL</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                  <Text style={styles.saveText}>SAVE CHANGES</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <PickerModal visible={runPicker}   title="A · STATUS"    items={STATUS_RUN_LIST} selected={statusRun} onSelect={setStatusRun} onClose={() => setRunPicker(false)} />
      <PickerModal visible={stagePicker} title="B · STAGE"     items={STAGE_LIST}      selected={stage}     onSelect={setStage}     onClose={() => setStagePicker(false)} />
      <PickerModal visible={typePicker}  title="I · APP TYPE"  items={APP_TYPE_LIST}   selected={appType}   onSelect={setAppType}   onClose={() => setTypePicker(false)} />
      <PickerModal visible={classPicker} title="G · CLASS"     items={CLASS_LIST}      selected={cls}       onSelect={setCls}       onClose={() => setClassPicker(false)} />
      <PickerModal visible={yearPicker}  title="Q · YEAR"      items={YEAR_LIST}       selected={year}      onSelect={setYear}      onClose={() => setYearPicker(false)} />
    </>
  );
}

const ps = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(12,12,12,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.white, borderTopWidth: 3, borderTopColor: COLORS.black, borderTopLeftRadius: 6, borderTopRightRadius: 6, maxHeight: '60%' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderBottomWidth: 2, borderBottomColor: COLORS.cream2 },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 18, color: COLORS.black, letterSpacing: 1 },
  closeBtn: { padding: 6 },
  closeText: { fontFamily: 'DMMono_500Medium', fontSize: 14, color: COLORS.gray },
  item: { paddingHorizontal: 16, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: COLORS.cream2 },
  itemActive: { backgroundColor: COLORS.statusRedBg },
  itemText: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: COLORS.dim },
  itemTextActive: { fontFamily: 'SpaceGrotesk_700Bold', color: COLORS.orange },
  check: { fontFamily: 'DMMono_500Medium', color: COLORS.orange, fontSize: 14 },
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(12,12,12,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.cream, borderTopWidth: 3, borderTopColor: COLORS.orange, borderTopLeftRadius: 8, borderTopRightRadius: 8, maxHeight: '92%' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 3, borderBottomColor: COLORS.black, backgroundColor: COLORS.black },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: COLORS.white, letterSpacing: 2, flex: 1 },
  subtitle: { fontFamily: 'DMMono_500Medium', fontSize: 10, color: COLORS.tealLt, marginRight: 12, letterSpacing: 1 },
  closeBtn: { backgroundColor: COLORS.orange, borderRadius: 4, padding: 6, borderWidth: 2, borderColor: COLORS.white },
  closeText: { fontFamily: 'DMMono_500Medium', fontSize: 12, color: COLORS.white },
  body: { padding: 16, paddingBottom: 48 },
  section: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.orange, letterSpacing: 1.5, marginTop: 18, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: COLORS.orange, paddingLeft: 8 },
  fieldBlock: { marginBottom: 10 },
  fieldLabel: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.gray, letterSpacing: 1, marginBottom: 4 },
  req: { color: COLORS.orange },
  input: { backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.black, paddingHorizontal: 12, paddingVertical: 9, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: COLORS.black },
  multi: { height: 72, textAlignVertical: 'top' },
  readOnly: { paddingVertical: 10, backgroundColor: '#f5f5f0', borderColor: COLORS.cream2, justifyContent: 'center' },
  picker: { backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.black, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerValue: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: COLORS.black, flex: 1 },
  pickerPlaceholder: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 13, color: COLORS.gray, flex: 1 },
  pickerArrow: { fontFamily: 'DMMono_500Medium', fontSize: 10, color: COLORS.gray },
  actions: { flexDirection: 'row', gap: 10, marginTop: 28 },
  cancelBtn: { flex: 1, backgroundColor: COLORS.white, borderWidth: 2.5, borderColor: COLORS.black, borderRadius: 6, paddingVertical: 12, alignItems: 'center', shadowColor: COLORS.black, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  cancelText: { fontFamily: 'DMMono_500Medium', fontSize: 11, color: COLORS.black, letterSpacing: 1 },
  saveBtn: { flex: 2, backgroundColor: COLORS.orange, borderWidth: 2.5, borderColor: COLORS.black, borderRadius: 6, paddingVertical: 12, alignItems: 'center', shadowColor: COLORS.black, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  saveText: { fontFamily: 'DMMono_500Medium', fontSize: 11, color: COLORS.white, letterSpacing: 1 },
});
