import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@/theme/ThemeProvider';
import { useAuthStore } from '@/store/useAuthStore';
import { useFinanceStore } from '@/store/useFinanceStore';
import { formatCurrency, maskValue, formatDateShort } from '@/lib/finance';
import ScreenHeader from '@/components/ScreenHeader';
import StatCard from '@/components/StatCard';
import PillButton from '@/components/PillButton';
import type { RootStackParamList } from '@/navigation';

const PAGE_SIZE = 10;

const TransactionsScreen = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { transactions, categories, deleteTransaction } = useFinanceStore();
  const { privacyMode } = useAuthStore();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));
  const getCat = (id: string) => categories.find((c) => c.id === id);

  const filtered = useMemo(() => {
    let list = [...transactions].sort((a, b) => b.date.localeCompare(a.date));
    if (filter !== 'all') list = list.filter((t) => t.type === filter);
    if (search) list = list.filter((t) => t.description.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [transactions, filter, search]);

  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filter, search]);

  const displayed = useMemo(
    () => filtered.slice(0, visibleCount),
    [filtered, visibleCount],
  );

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length));
  }, [filtered.length]);

  const handleDelete = (id: string, desc: string) => {
    Alert.alert('Excluir transação', `Deseja excluir "${desc}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setDeletingId(id);
          try {
            await deleteTransaction(id);
          } catch (err: any) {
            Alert.alert('Erro', err.message || 'Falha ao excluir transação.');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <ScreenHeader title="Transações" />

      {/* Search */}
      <View style={[styles.searchContainer, { paddingHorizontal: 20 }]}>
        <View style={[styles.searchBox, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
          <Ionicons name="search-outline" size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Buscar transação..."
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterRow}>
        <PillButton label="Todas" active={filter === 'all'} onPress={() => setFilter('all')} />
        <PillButton label="Receitas" active={filter === 'income'} onPress={() => setFilter('income')} />
        <PillButton label="Despesas" active={filter === 'expense'} onPress={() => setFilter('expense')} />
      </View>

      <FlatList
        data={displayed}
        keyExtractor={(item) => item.id}
        style={styles.list}
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Nenhuma transação encontrada
          </Text>
        }
        ListFooterComponent={
          visibleCount < filtered.length ? (
            <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 16 }} />
          ) : (
            <View style={{ height: 100 }} />
          )
        }
        renderItem={({ item: tx }) => {
          const cat = getCat(tx.categoryId);
          return (
            <TouchableOpacity
              onLongPress={() => handleDelete(tx.id, tx.description)}
              activeOpacity={0.7}
            >
              <StatCard style={styles.txCard}>
                <View style={styles.txRow}>
                  <View style={styles.txLeft}>
                    <Text style={styles.txIcon}>{cat?.icon ?? '📋'}</Text>
                    <View style={styles.txInfo}>
                      <Text style={[styles.txDesc, { color: colors.text }]}>{tx.description}</Text>
                      <Text style={[styles.txMeta, { color: colors.textMuted }]}>
                        {cat?.name} · {formatDateShort(tx.date)}
                        {tx.recurring ? ' · 🔄' : ''}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.txRight}>
                    <Text
                      style={[
                        styles.txAmount,
                        { color: tx.type === 'income' ? colors.income : colors.expense },
                      ]}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {mv(tx.amount)}
                    </Text>
                    {deletingId === tx.id ? (
                      <ActivityIndicator size="small" color={colors.destructive} />
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleDelete(tx.id, tx.description)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="trash-outline" size={16} color={colors.destructive} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </StatCard>
            </TouchableOpacity>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => navigation.navigate('TransactionForm')}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1 },
  searchContainer: {
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 8,
    marginBottom: 16,
  },
  list: {
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 40,
  },
  txCard: {
    marginBottom: 8,
  },
  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  txIcon: {
    fontSize: 22,
  },
  txInfo: {
    flex: 1,
  },
  txDesc: {
    fontSize: 14,
    fontWeight: '500',
  },
  txMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  txRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default TransactionsScreen;
