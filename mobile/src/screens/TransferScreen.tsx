import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '@/theme/ThemeProvider';
import { useFinanceStore } from '@/store/useFinanceStore';
import { formatCurrency } from '@/lib/finance';
import InputField from '@/components/InputField';
import StatCard from '@/components/StatCard';

const TransferScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { accounts, transfer } = useFinanceStore();

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [amount, setAmount] = useState('');

  const handleTransfer = async () => {
    const val = parseFloat(amount);
    if (!fromId || !toId || !val || fromId === toId) return;
    await transfer(fromId, toId, val);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={[]}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>De</Text>
        <View style={styles.accountList}>
          {accounts.map((acc) => (
            <TouchableOpacity
              key={acc.id}
              onPress={() => setFromId(acc.id)}
              style={[
                styles.accountChip,
                {
                  backgroundColor: fromId === acc.id ? colors.primary : colors.mutedBg,
                  borderColor: fromId === acc.id ? colors.primary : colors.surfaceBorder,
                },
              ]}
            >
              <Text style={[styles.accountName, { color: fromId === acc.id ? '#fff' : colors.text }]}>
                {acc.name}
              </Text>
              <Text style={[styles.accountBalance, { color: fromId === acc.id ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>
                {formatCurrency(acc.balance)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.sectionLabel, { color: colors.textSecondary, marginTop: 20 }]}>Para</Text>
        <View style={styles.accountList}>
          {accounts.filter((a) => a.id !== fromId).map((acc) => (
            <TouchableOpacity
              key={acc.id}
              onPress={() => setToId(acc.id)}
              style={[
                styles.accountChip,
                {
                  backgroundColor: toId === acc.id ? colors.primary : colors.mutedBg,
                  borderColor: toId === acc.id ? colors.primary : colors.surfaceBorder,
                },
              ]}
            >
              <Text style={[styles.accountName, { color: toId === acc.id ? '#fff' : colors.text }]}>
                {acc.name}
              </Text>
              <Text style={[styles.accountBalance, { color: toId === acc.id ? 'rgba(255,255,255,0.8)' : colors.textMuted }]}>
                {formatCurrency(acc.balance)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginTop: 20 }}>
          <InputField
            label="Valor (R$)"
            value={amount}
            onChangeText={setAmount}
            placeholder="0,00"
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: colors.primary }]}
          onPress={handleTransfer}
        >
          <Ionicons name="swap-horizontal" size={20} color="#fff" />
          <Text style={styles.submitText}>Transferir</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  accountList: {
    gap: 8,
  },
  accountChip: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '600',
  },
  accountBalance: {
    fontSize: 12,
    marginTop: 2,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
    marginTop: 24,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default TransferScreen;
