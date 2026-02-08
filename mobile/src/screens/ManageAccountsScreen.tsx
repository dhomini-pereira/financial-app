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
import { formatCurrency, maskValue, accountTypeLabel, accountTypeIcon } from '@/lib/finance';
import StatCard from '@/components/StatCard';
import BalanceCard from '@/components/BalanceCard';
import InputField from '@/components/InputField';
import FormModal from '@/components/FormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import PillButton from '@/components/PillButton';
import type { Account } from '@/types/finance';

const colorOptions = [
  { value: '#eab308', label: 'Amarelo' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#f97316', label: 'Laranja' },
  { value: '#0ea5e9', label: 'Azul' },
  { value: '#16a34a', label: 'Verde' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#06b6d4', label: 'Ciano' },
];

const accountTypes: { value: Account['type']; label: string }[] = [
  { value: 'wallet', label: 'Carteira' },
  { value: 'checking', label: 'Conta Corrente' },
  { value: 'digital', label: 'Conta Digital' },
  { value: 'investment', label: 'Investimentos' },
];

const ManageAccountsScreen = () => {
  const { colors } = useTheme();
  const { accounts, addAccount, updateAccount, deleteAccount } = useFinanceStore();
  const { privacyMode } = useAuthStore();
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));
  const total = accounts.reduce((s, a) => s + a.balance, 0);

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [toDelete, setToDelete] = useState<Account | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('checking');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState(colorOptions[0].value);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setType('checking');
    setBalance('');
    setColor(colorOptions[0].value);
    setModalVisible(true);
  };

  const openEdit = (account: Account) => {
    setEditing(account);
    setName(account.name);
    setType(account.type);
    setBalance(account.balance.toString());
    setColor(account.color);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const balanceNum = parseFloat(balance) || 0;
    if (!name.trim()) return;
    if (editing) {
      await updateAccount(editing.id, { name, type, balance: balanceNum, color });
    } else {
      await addAccount({ name, type, balance: balanceNum, color });
    }
    setModalVisible(false);
  };

  const confirmDelete = (account: Account) => {
    setToDelete(account);
    setDeleteVisible(true);
  };

  const handleDelete = async () => {
    if (toDelete) {
      await deleteAccount(toDelete.id);
      setDeleteVisible(false);
      setToDelete(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <BalanceCard label="Saldo consolidado" value={mv(total)} />

        <View style={styles.content}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={openAdd}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Adicionar Conta</Text>
          </TouchableOpacity>

          {accounts.map((account) => (
            <StatCard key={account.id} style={styles.card}>
              <View style={styles.row}>
                <View style={styles.left}>
                  <View style={[styles.iconBox, { backgroundColor: account.color + '20' }]}>
                    <Ionicons
                      name={(accountTypeIcon[account.type] || 'wallet-outline') as any}
                      size={22}
                      color={account.color}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, { color: colors.text }]}>{account.name}</Text>
                    <Text style={[styles.typeLbl, { color: colors.textMuted }]}>
                      {accountTypeLabel[account.type]}
                    </Text>
                  </View>
                </View>
                <View style={styles.right}>
                  <Text style={[styles.balance, { color: colors.text }]}>{mv(account.balance)}</Text>
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => openEdit(account)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(account)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </StatCard>
          ))}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <FormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'Editar Conta' : 'Nova Conta'}
        onSave={handleSave}
        saveLabel={editing ? 'Salvar' : 'Adicionar'}
      >
        <InputField label="Nome" value={name} onChangeText={setName} placeholder="Ex: Nubank" />
        <InputField label="Saldo" value={balance} onChangeText={setBalance} placeholder="0,00" keyboardType="numeric" />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Tipo de conta</Text>
        <View style={styles.chipRow}>
          {accountTypes.map((at) => (
            <PillButton
              key={at.value}
              label={at.label}
              active={type === at.value}
              onPress={() => setType(at.value)}
            />
          ))}
        </View>

        <Text style={[styles.fieldLabel, { color: colors.textSecondary, marginTop: 16 }]}>Cor</Text>
        <View style={styles.colorRow}>
          {colorOptions.map((c) => (
            <TouchableOpacity
              key={c.value}
              onPress={() => setColor(c.value)}
              style={[
                styles.colorDot,
                { backgroundColor: c.value },
                color === c.value && styles.colorSelected,
              ]}
            />
          ))}
        </View>
      </FormModal>

      {/* Delete Dialog */}
      <ConfirmDialog
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={handleDelete}
        title="Excluir conta"
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
  card: { marginBottom: 10 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 14, fontWeight: '500' },
  typeLbl: { fontSize: 11, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  balance: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  actions: { flexDirection: 'row', gap: 12 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
  colorDot: { width: 32, height: 32, borderRadius: 16 },
  colorSelected: { borderWidth: 3, borderColor: '#fff', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, elevation: 4 },
});

export default ManageAccountsScreen;
