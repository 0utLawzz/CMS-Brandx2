import React, { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform,
  FlatList,
} from 'react-native';
import { COLORS } from '../constants/colors';
import { COL } from '../hooks/useSheet';
import { STATUS_LIST, STATUS_SUB_MAP, CITY_LIST, CLASS_LIST } from '../lib/status';

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
  onSave: (edits: Partial<Record<keyof typeof COL, string>>) => void;
  onClose: () => void;
}

export default function EditModal({ visible, row, onSave, onClose }: Props) {
  const [name, setName] = useState(row[COL.NAME] ?? '');
  const [tmNo, setTmNo] = useState(row[COL.NUMBER] ?? '');
  const [notes, setNotes] = useState(row[COL.NOTES] ?? '');
  const [status, setStatus] = useState(row[COL.STATUS] ?? '');
  const [subStatus, setSubStatus] = useState(row[COL.SUB_STATUS] ?? '');
  const [city, setCity] = useState(row[COL.CITY] ?? '');
  const [cls, setCls] = useState(row[COL.CLASS] ?? '');

  const [statusPickerOpen, setStatusPickerOpen] = useState(false);
  const [subPickerOpen, setSubPickerOpen] = useState(false);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [classPickerOpen, setClassPickerOpen] = useState(false);

  const subOptions = status ? (STATUS_SUB_MAP[status] ?? []) : [];

  function handleSave() {
    onSave({
      NAME: name, NUMBER: tmNo, STATUS: status,
      SUB_STATUS: subStatus, CITY: city, CLASS: cls, NOTES: notes,
    });
    onClose();
  }

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
              <Text style={styles.subtitle}>{row[COL.CASE_NO] ?? ''}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              <Text style={styles.notice}>⚠ LOCAL EDITS — Changes are session-only. Update your Google Sheet to persist.</Text>

              <Text style={styles.fieldLabel}>APP NAME</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Application / Logo name" placeholderTextColor={COLORS.gray} />

              <Text style={styles.fieldLabel}>TM NUMBER</Text>
              <TextInput style={styles.input} value={tmNo} onChangeText={setTmNo} placeholder="6-digit TM number" placeholderTextColor={COLORS.gray} keyboardType="numeric" maxLength={6} />

              <Text style={styles.fieldLabel}>CLASS</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setClassPickerOpen(true)}>
                <Text style={cls ? styles.pickerValue : styles.pickerPlaceholder}>{cls || 'Select class (1–45)'}</Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>STATUS</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setStatusPickerOpen(true)}>
                <Text style={status ? styles.pickerValue : styles.pickerPlaceholder}>{status || 'Select status'}</Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>SUB STATUS</Text>
              <TouchableOpacity
                style={[styles.picker, !status && styles.pickerDisabled]}
                onPress={() => status && setSubPickerOpen(true)}
              >
                <Text style={subStatus ? styles.pickerValue : styles.pickerPlaceholder}>{subStatus || 'Select sub-status'}</Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>CITY</Text>
              <TouchableOpacity style={styles.picker} onPress={() => setCityPickerOpen(true)}>
                <Text style={city ? styles.pickerValue : styles.pickerPlaceholder}>{city || 'Select city'}</Text>
                <Text style={styles.pickerArrow}>▼</Text>
              </TouchableOpacity>

              <Text style={styles.fieldLabel}>NOTES</Text>
              <TextInput
                style={[styles.input, styles.inputMulti]}
                value={notes} onChangeText={setNotes}
                placeholder="Add notes…" placeholderTextColor={COLORS.gray}
                multiline numberOfLines={3}
              />

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

      <PickerModal visible={statusPickerOpen} title="SELECT STATUS" items={STATUS_LIST}
        selected={status} onSelect={(v) => { setStatus(v); setSubStatus(''); }} onClose={() => setStatusPickerOpen(false)} />
      <PickerModal visible={subPickerOpen} title="SELECT SUB-STATUS" items={subOptions}
        selected={subStatus} onSelect={setSubStatus} onClose={() => setSubPickerOpen(false)} />
      <PickerModal visible={cityPickerOpen} title="SELECT CITY" items={CITY_LIST}
        selected={city} onSelect={setCity} onClose={() => setCityPickerOpen(false)} />
      <PickerModal visible={classPickerOpen} title="SELECT CLASS" items={CLASS_LIST}
        selected={cls} onSelect={setCls} onClose={() => setClassPickerOpen(false)} />
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
  sheet: { backgroundColor: COLORS.cream, borderTopWidth: 3, borderTopColor: COLORS.orange, borderTopLeftRadius: 8, borderTopRightRadius: 8, maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 3, borderBottomColor: COLORS.black, backgroundColor: COLORS.black },
  title: { fontFamily: 'BebasNeue_400Regular', fontSize: 22, color: COLORS.white, letterSpacing: 2, flex: 1 },
  subtitle: { fontFamily: 'DMMono_500Medium', fontSize: 10, color: COLORS.tealLt, marginRight: 12, letterSpacing: 1 },
  closeBtn: { backgroundColor: COLORS.orange, borderRadius: 4, padding: 6, borderWidth: 2, borderColor: COLORS.white },
  closeText: { fontFamily: 'DMMono_500Medium', fontSize: 12, color: COLORS.white },
  body: { padding: 16, paddingBottom: 32 },
  notice: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.yellow, backgroundColor: 'rgba(212,168,0,0.12)', borderWidth: 1.5, borderColor: COLORS.yellow, borderRadius: 4, padding: 8, marginBottom: 14, letterSpacing: 0.3, lineHeight: 14 },
  fieldLabel: { fontFamily: 'DMMono_500Medium', fontSize: 9, color: COLORS.gray, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, marginTop: 10 },
  input: { backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.black, borderRadius: 0, paddingHorizontal: 12, paddingVertical: 9, fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: COLORS.black },
  inputMulti: { height: 80, textAlignVertical: 'top' },
  picker: { backgroundColor: COLORS.white, borderWidth: 2, borderColor: COLORS.black, borderRadius: 0, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pickerDisabled: { opacity: 0.4 },
  pickerValue: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: COLORS.black, flex: 1 },
  pickerPlaceholder: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 14, color: COLORS.gray, flex: 1 },
  pickerArrow: { fontFamily: 'DMMono_500Medium', fontSize: 10, color: COLORS.gray },
  actions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: COLORS.white, borderWidth: 2.5, borderColor: COLORS.black, borderRadius: 6, paddingVertical: 12, alignItems: 'center', shadowColor: COLORS.black, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  cancelText: { fontFamily: 'DMMono_500Medium', fontSize: 11, color: COLORS.black, letterSpacing: 1, textTransform: 'uppercase' },
  saveBtn: { flex: 2, backgroundColor: COLORS.orange, borderWidth: 2.5, borderColor: COLORS.black, borderRadius: 6, paddingVertical: 12, alignItems: 'center', shadowColor: COLORS.black, shadowOffset: { width: 3, height: 3 }, shadowOpacity: 1, shadowRadius: 0, elevation: 3 },
  saveText: { fontFamily: 'DMMono_500Medium', fontSize: 11, color: COLORS.white, letterSpacing: 1, textTransform: 'uppercase' },
});
