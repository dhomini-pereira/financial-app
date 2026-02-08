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
import ProgressBar from '@/components/ProgressBar';
import InputField from '@/components/InputField';
import FormModal from '@/components/FormModal';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { Goal } from '@/types/finance';

const emojiOptions = ['🎯', '🛡️', '✈️', '💻', '🏠', '🚗', '💍', '🎓', '💰', '🏖️', '🎮', '💎'];

const ManageGoalsScreen = () => {
  const { colors } = useTheme();
  const { goals, addGoal, updateGoal, deleteGoal } = useFinanceStore();
  const { privacyMode } = useAuthStore();
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));

  const [modalVisible, setModalVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [toDelete, setToDelete] = useState<Goal | null>(null);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalCurrent = goals.reduce((s, g) => s + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  const openAdd = () => {
    setEditing(null);
    setName('');
    setIcon('🎯');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline('');
    setModalVisible(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setName(goal.name);
    setIcon(goal.icon);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setDeadline(goal.deadline);
    setModalVisible(true);
  };

  const handleSave = async () => {
    const target = parseFloat(targetAmount) || 0;
    const current = parseFloat(currentAmount) || 0;
    if (!name.trim() || target <= 0) return;
    if (editing) {
      await updateGoal(editing.id, { name, icon, targetAmount: target, currentAmount: current, deadline });
    } else {
      await addGoal({ name, icon, targetAmount: target, currentAmount: current, deadline });
    }
    setModalVisible(false);
  };

  const confirmDelete = (goal: Goal) => {
    setToDelete(goal);
    setDeleteVisible(true);
  };

  const handleDelete = async () => {
    if (toDelete) {
      await deleteGoal(toDelete.id);
      setDeleteVisible(false);
      setToDelete(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Overall Progress */}
        <BalanceCard label="Progresso geral" value={`${overallProgress.toFixed(0)}%`}>
          <ProgressBar value={overallProgress} height={6} />
          <View style={styles.progressFooter}>
            <Text style={styles.progressText}>{mv(totalCurrent)}</Text>
            <Text style={styles.progressText}>{mv(totalTarget)}</Text>
          </View>
        </BalanceCard>

        <View style={styles.content}>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={openAdd}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addBtnText}>Adicionar Meta</Text>
          </TouchableOpacity>

          {goals.map((goal) => {
            const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
            const remaining = goal.targetAmount - goal.currentAmount;
            return (
              <StatCard key={goal.id} style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardLeft}>
                    <Text style={styles.cardIcon}>{goal.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.cardName, { color: colors.text }]}>{goal.name}</Text>
                      {goal.deadline && (
                        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                          Prazo: {formatDate(goal.deadline)}
                        </Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEdit(goal)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDelete(goal)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                    </TouchableOpacity>
                  </View>
                </View>
                <ProgressBar value={pct} />
                <View style={styles.cardFooter}>
                  <Text style={[styles.footerText, { color: colors.textMuted }]}>
                    Atual: {mv(goal.currentAmount)}
                  </Text>
                  <Text style={[styles.footerPct, { color: colors.text }]}>{pct.toFixed(0)}%</Text>
                  <Text style={[styles.footerText, { color: colors.textMuted }]}>
                    Meta: {mv(goal.targetAmount)}
                  </Text>
                </View>
                <Text style={[styles.footerRemaining, { color: colors.textMuted }]}>
                  Faltam {mv(remaining > 0 ? remaining : 0)}
                </Text>
              </StatCard>
            );
          })}
        </View>
      </ScrollView>

      {/* Add/Edit Modal */}
      <FormModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        title={editing ? 'Editar Meta' : 'Nova Meta'}
        onSave={handleSave}
        saveLabel={editing ? 'Salvar' : 'Adicionar'}
      >
        <InputField label="Nome" value={name} onChangeText={setName} placeholder="Ex: Reserva de Emergência" />

        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Ícone</Text>
        <View style={styles.emojiRow}>
          {emojiOptions.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              onPress={() => setIcon(emoji)}
              style={[
                styles.emojiBtn,
                {
                  backgroundColor: icon === emoji ? colors.primary : colors.mutedBg,
                },
              ]}
            >
              <Text style={styles.emojiText}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.rowInputs}>
          <View style={{ flex: 1 }}>
            <InputField label="Valor da Meta" value={targetAmount} onChangeText={setTargetAmount} placeholder="30000" keyboardType="numeric" />
          </View>
          <View style={{ flex: 1 }}>
            <InputField label="Valor Atual" value={currentAmount} onChangeText={setCurrentAmount} placeholder="5000" keyboardType="numeric" />
          </View>
        </View>

        <InputField
          label="Prazo (AAAA-MM-DD)"
          value={deadline}
          onChangeText={setDeadline}
          placeholder="2026-12-31"
        />
      </FormModal>

      {/* Delete Dialog */}
      <ConfirmDialog
        visible={deleteVisible}
        onClose={() => setDeleteVisible(false)}
        onConfirm={handleDelete}
        title="Excluir meta"
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
  card: { marginBottom: 12 },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  cardIcon: { fontSize: 24 },
  cardName: { fontSize: 14, fontWeight: '500' },
  cardMeta: { fontSize: 11, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 12 },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  footerText: { fontSize: 11 },
  footerPct: { fontSize: 12, fontWeight: '600' },
  footerRemaining: { fontSize: 12, textAlign: 'center', marginTop: 4 },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  progressText: { fontSize: 11, color: 'rgba(255,255,255,0.7)' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  emojiBtn: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  emojiText: { fontSize: 22 },
  rowInputs: { flexDirection: 'row', gap: 12 },
});

export default ManageGoalsScreen;
