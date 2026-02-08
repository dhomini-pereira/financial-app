import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { formatCurrency, maskValue, formatDate } from '@/lib/finance';
import StatCard from '@/components/StatCard';
import BalanceCard from '@/components/BalanceCard';
import InputField from '@/components/InputField';
import FormModal from '@/components/FormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { Investment } from '@/types/finance';

const investmentTypes = ['CDB', 'Tesouro', 'Ações', 'FII', 'Reserva', 'Cripto', 'Outro'];

const ManageInvestmentsScreen = () => {
  const { colors } = useTheme();
  const { investments, addInvestment, updateInvestment, deleteInvestment } = useFinanceStore();
  const { privacyMode } = useAuthStore();
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));

  const totalInvested = investments.reduce((s, i) => s + i.currentValue, 0);
  const totalReturn = investments.reduce((s, i) => s + (i.currentValue - i.principal), 0);
  const totalPrincipal = investments.reduce((s, i) => s + i.principal, 0);

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [toDelete, setToDelete] = useState<Investment | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState('CDB');
  const [principal, setPrincipal] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [returnRate, setReturnRate] = useState('');
  const [startDate, setStartDate] = useState('');

  const openAdd = () => {
    setEditing(null);
    setName('');
    setType('CDB');
    setPrincipal('');
    setCurrentValue('');
    setReturnRate('');
    setStartDate('');
    setModalVisible(true);
  };

  const openEdit = (inv: Investment) => {
    setEditing(inv);
    setName(inv.name);
    setType(inv.type);
    setPrincipal(inv.principal.toString());
    setCurrentValue(inv.currentValue.toString());
    setReturnRate(inv.returnRate.toString());
    setStartDate(inv.startDate);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const principalNum = parseFloat(principal) || 0;
    const currentNum = parseFloat(currentValue) || 0;
    const rateNum = parseFloat(returnRate) || 0;
    if (!name.trim() || principalNum <= 0) return;

    if (editing) {
      await updateInvestment(editing.id, {
        name,
        type,
        principal: principalNum,
        currentValue: currentNum || principalNum,
        returnRate: rateNum,
        startDate,
      });
    } else {
      await addInvestment({
        name,
        type,
        principal: principalNum,
        currentValue: currentNum || principalNum,
        returnRate: rateNum,
        startDate: startDate || new Date().toISOString().split('T')[0],
      });
    }
    setModalVisible(false);
  };

  const confirmDelete = (inv: Investment) => {
    setToDelete(inv);
    setDeleteVisible(true);
  };

  const handleDelete = async () => {
    if (toDelete) {
      await deleteInvestment(toDelete.id);
      setDeleteVisible(false);
      setToDelete(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <BalanceCard label="Total investido" value={mv(totalInvested)}>
          <View style={styles.balanceRow}>
            <View>
              <Text style={styles.balanceLabel}>Investido</Text>
              <Text style={styles.balanceValue}>{mv(totalPrincipal)}</Text>
            </View>
            <View>
              <Text style={styles.balanceLabel}>Rendimento</Text>
              <Text style={[styles.balanceValue, { color: '#86efac' }]}>+{mv(totalReturn)}</Text>
            </View>
          </View>
        </BalanceCard>

        <View style={styles.content}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={openAdd}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Adicionar Investimento</Text>
          </TouchableOpacity>

          {investments.map((inv) => {
            const returnVal = inv.currentValue - inv.principal;
            const returnPct = inv.principal > 0 ? ((returnVal / inv.principal) * 100).toFixed(1) : '0';
            return (
              <StatCard key={inv.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: colors.text }]}>{inv.name}</Text>
                    <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                      {inv.type} · {inv.returnRate}% a.a. · Desde {formatDate(inv.startDate)}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEdit(inv)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(inv)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.valuesRow}>
                  <View>
                    <Text style={[styles.valueLabel, { color: colors.textMuted }]}>Investido</Text>
                    <Text style={[styles.valueText, { color: colors.text }]}>{mv(inv.principal)}</Text>
                  </View>
                  <View>
                    <Text style={[styles.valueLabel, { color: colors.textMuted }]}>Atual</Text>
                    <Text style={[styles.valueText, { color: colors.text }]}>{mv(inv.currentValue)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.valueLabel, { color: colors.textMuted }]}>Retorno</Text>
                    <Text style={[styles.valueText, { color: returnVal >= 0 ? colors.income : colors.expense }]}>
                      {returnVal >= 0 ? '+' : ''}{mv(returnVal)} ({returnPct}%)
                    </Text>
                  </View>
                </View>
              </StatCard>
            );
          })}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <FormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'Editar Investimento' : 'Novo Investimento'}
        onSave={handleSave}
        saveLabel={editing ? 'Salvar' : 'Adicionar'}
      >
        <InputField label="Nome" value={name} onChangeText={setName} placeholder="Ex: CDB Banco Inter" />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tipo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll}>
          {investmentTypes.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setType(t)}
              style={[
                styles.typeChip,
                { backgroundColor: type === t ? colors.primary : colors.mutedBg },
              ]}
            >
              <Text style={[styles.typeChipText, { color: type === t ? '#fff' : colors.textSecondary }]}>
                {t}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.rowInputs}>
          <View style={{ flex: 1 }}>
            <InputField label="Capital investido" value={principal} onChangeText={setPrincipal} placeholder="8000" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <InputField label="Valor atual" value={currentValue} onChangeText={setCurrentValue} placeholder="8450" keyboardType="numeric" />
          </View>
        </View>

        <InputField label="Taxa de retorno (% a.a.)" value={returnRate} onChangeText={setReturnRate} placeholder="12.5" keyboardType="numeric" />
        <InputField label="Data de início (AAAA-MM-DD)" value={startDate} onChangeText={setStartDate} placeholder="2024-06-01" />
      </FormModal>

      {/* Delete Dialog */}
      <ConfirmDialog
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={handleDelete}
        title="Excluir investimento"
        message={`Deseja excluir "${toDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        destructive
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20 },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  balanceLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)' },
  balanceValue: { fontSize: 13, fontWeight: '600', color: '#fff', marginTop: 2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    gap: 8,
    marginBottom: 16,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  card: { marginBottom: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardName: { fontSize: 14, fontWeight: '600' },
  cardMeta: { fontSize: 11, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 12 },
  valuesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  valueLabel: { fontSize: 10 },
  valueText: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  typeScroll: { marginBottom: 16 },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
  },
  typeChipText: { fontSize: 13, fontWeight: '500' },
  rowInputs: { flexDirection: 'row', gap: 12 },
});

export default ManageInvestmentsScreen;
