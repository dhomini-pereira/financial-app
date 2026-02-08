import { useState } from 'react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency, maskValue } from '@/lib/finance';
import PrivacyToggle from '@/components/finance/PrivacyToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Wallet, Building, Smartphone, TrendingUp, Plus, Pencil, Trash2 } from 'lucide-react';
import type { Account } from '@/types/finance';

const iconMap = {
  wallet: Wallet,
  checking: Building,
  digital: Smartphone,
  investment: TrendingUp,
};

const typeLabels = {
  wallet: 'Carteira',
  checking: 'Conta Corrente',
  digital: 'Conta Digital',
  investment: 'Investimentos',
};

const colorOptions = [
  { value: 'hsl(38, 92%, 50%)', label: 'Amarelo' },
  { value: 'hsl(280, 70%, 50%)', label: 'Roxo' },
  { value: 'hsl(24, 95%, 50%)', label: 'Laranja' },
  { value: 'hsl(199, 89%, 48%)', label: 'Azul' },
  { value: 'hsl(142, 76%, 36%)', label: 'Verde' },
  { value: 'hsl(346, 77%, 50%)', label: 'Rosa' },
];

const ManageAccounts = () => {
  const { accounts, addAccount, updateAccount, deleteAccount } = useFinanceStore();
  const { privacyMode } = useAuthStore();
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));
  const total = accounts.reduce((s, a) => s + a.balance, 0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);

  const [name, setName] = useState('');
  const [type, setType] = useState<Account['type']>('checking');
  const [balance, setBalance] = useState('');
  const [color, setColor] = useState(colorOptions[0].value);

  const openAddDialog = () => {
    setEditingAccount(null);
    setName('');
    setType('checking');
    setBalance('');
    setColor(colorOptions[0].value);
    setDialogOpen(true);
  };

  const openEditDialog = (account: Account) => {
    setEditingAccount(account);
    setName(account.name);
    setType(account.type);
    setBalance(account.balance.toString());
    setColor(account.color);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const balanceNum = parseFloat(balance) || 0;
    if (!name.trim()) return;

    if (editingAccount) {
      updateAccount(editingAccount.id, { name, type, balance: balanceNum, color });
    } else {
      addAccount({ name, type, balance: balanceNum, color });
    }
    setDialogOpen(false);
  };

  const confirmDelete = (account: Account) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (accountToDelete) {
      deleteAccount(accountToDelete.id);
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-xl font-bold">Gerenciar Contas</h1>
        <PrivacyToggle />
      </div>

      <div className="balance-card mb-6 animate-slide-up">
        <p className="text-sm opacity-80">Saldo consolidado</p>
        <p className="text-3xl font-bold mt-1">{mv(total)}</p>
      </div>

      <Button onClick={openAddDialog} className="w-full mb-4 gap-2">
        <Plus className="h-4 w-4" />
        Adicionar Conta
      </Button>

      <div className="space-y-3">
        {accounts.map((account) => {
          const Icon = iconMap[account.type];
          return (
            <div key={account.id} className="stat-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: account.color + '20' }}>
                  <Icon className="h-5 w-5" style={{ color: account.color }} />
                </div>
                <div>
                  <p className="text-sm font-medium">{account.name}</p>
                  <p className="text-[11px] text-muted-foreground">{typeLabels[account.type]}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <p className="font-semibold mr-2">{mv(account.balance)}</p>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(account)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirmDelete(account)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? 'Editar Conta' : 'Nova Conta'}</DialogTitle>
            <DialogDescription>
              {editingAccount ? 'Atualize as informações da conta.' : 'Adicione uma nova conta ao seu controle financeiro.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Nubank" />
            </div>
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as Account['type'])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wallet">Carteira</SelectItem>
                  <SelectItem value="checking">Conta Corrente</SelectItem>
                  <SelectItem value="digital">Conta Digital</SelectItem>
                  <SelectItem value="investment">Investimentos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="balance">Saldo</Label>
              <Input id="balance" type="number" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label htmlFor="color">Cor</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: c.value }} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingAccount ? 'Salvar' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Conta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a conta "{accountToDelete?.name}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleDelete}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ManageAccounts;
