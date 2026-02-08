import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { formatCurrency, maskValue, accountTypeLabel, accountTypeIcon } from '@/lib/finance';
import ScreenHeader from '@/components/ScreenHeader';
import BalanceCard from '@/components/BalanceCard';
import StatCard from '@/components/StatCard';

const AccountsScreen = () => {
  const { colors } = useTheme();
  const { accounts } = useFinanceStore();
  const { privacyMode } = useAuthStore();
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));
  const total = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Contas" />

        <BalanceCard label="Saldo consolidado" value={mv(total)} />

        <View style={styles.list}>
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
                  <View>
                    <Text style={[styles.name, { color: colors.text }]}>{account.name}</Text>
                    <Text style={[styles.type, { color: colors.textMuted }]}>
                      {accountTypeLabel[account.type]}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.balance, { color: colors.text }]}>{mv(account.balance)}</Text>
              </View>
            </StatCard>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  list: {
    paddingHorizontal: 20,
    gap: 10,
  },
  card: {
    marginBottom: 0,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
  },
  type: {
    fontSize: 11,
    marginTop: 2,
  },
  balance: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AccountsScreen;
