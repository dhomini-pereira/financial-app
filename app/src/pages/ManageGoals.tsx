import { useState } from 'react';
import { useFinanceStore } from '@/store/useFinanceStore';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCurrency, maskValue } from '@/lib/finance';
import PrivacyToggle from '@/components/finance/PrivacyToggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Target, Plus, Pencil, Trash2 } from 'lucide-react';
import type { Goal } from '@/types/finance';

const emojiOptions = ['🎯', '🛡️', '✈️', '💻', '🏠', '🚗', '💍', '🎓', '💰', '🏖️'];

const ManageGoals = () => {
  const { goals, addGoal, updateGoal, deleteGoal } = useFinanceStore();
  const { privacyMode } = useAuthStore();
  const mv = (v: number) => maskValue(privacyMode, formatCurrency(v));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🎯');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [deadline, setDeadline] = useState('');

  const openAddDialog = () => {
    setEditingGoal(null);
    setName('');
    setIcon('🎯');
    setTargetAmount('');
    setCurrentAmount('');
    setDeadline('');
    setDialogOpen(true);
  };

  const openEditDialog = (goal: Goal) => {
    setEditingGoal(goal);
    setName(goal.name);
    setIcon(goal.icon);
    setTargetAmount(goal.targetAmount.toString());
    setCurrentAmount(goal.currentAmount.toString());
    setDeadline(goal.deadline);
    setDialogOpen(true);
  };

  const handleSave = () => {
    const target = parseFloat(targetAmount) || 0;
    const current = parseFloat(currentAmount) || 0;
    if (!name.trim() || target <= 0) return;

    if (editingGoal) {
      updateGoal(editingGoal.id, { name, icon, targetAmount: target, currentAmount: current, deadline });
    } else {
      addGoal({ name, icon, targetAmount: target, currentAmount: current, deadline });
    }
    setDialogOpen(false);
  };

  const confirmDelete = (goal: Goal) => {
    setGoalToDelete(goal);
    setDeleteDialogOpen(true);
  };

  const handleDelete = () => {
    if (goalToDelete) {
      deleteGoal(goalToDelete.id);
      setDeleteDialogOpen(false);
      setGoalToDelete(null);
    }
  };

  const totalTarget = goals.reduce((s, g) => s + g.targetAmount, 0);
  const totalCurrent = goals.reduce((s, g) => s + g.currentAmount, 0);
  const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="text-xl font-bold">Gerenciar Metas</h1>
        <PrivacyToggle />
      </div>

      <div className="balance-card mb-6 animate-slide-up">
        <p className="text-sm opacity-80">Progresso geral</p>
        <p className="text-3xl font-bold mt-1">{overallProgress.toFixed(0)}%</p>
        <Progress value={overallProgress} className="h-2 mt-2" />
        <div className="flex justify-between mt-1">
          <span className="text-xs opacity-70">{mv(totalCurrent)}</span>
          <span className="text-xs opacity-70">{mv(totalTarget)}</span>
        </div>
      </div>

      <Button onClick={openAddDialog} className="w-full mb-4 gap-2">
        <Plus className="h-4 w-4" />
        Adicionar Meta
      </Button>

      <div className="space-y-3">
        {goals.map((goal) => {
          const pct = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
          const remaining = goal.targetAmount - goal.currentAmount;
          return (
            <div key={goal.id} className="stat-card">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{goal.icon}</span>
                  <div>
                    <p className="text-sm font-medium">{goal.name}</p>
                    {goal.deadline && (
                      <p className="text-[11px] text-muted-foreground">
                        Prazo: {new Date(goal.deadline).toLocaleDateString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(goal)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => confirmDelete(goal)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <Progress value={pct} className="h-2 mb-2" />
              <div className="flex justify-between text-[11px]">
                <span className="text-muted-foreground">Atual: {mv(goal.currentAmount)}</span>
                <span className="font-medium">{pct.toFixed(0)}%</span>
                <span className="text-muted-foreground">Meta: {mv(goal.targetAmount)}</span>
              </div>
              <p className="text-xs text-center text-muted-foreground mt-1">
                Faltam {mv(remaining > 0 ? remaining : 0)}
              </p>
            </div>
          );
        })}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGoal ? 'Editar Meta' : 'Nova Meta'}</DialogTitle>
            <DialogDescription>
              {editingGoal ? 'Atualize as informações da meta.' : 'Defina uma nova meta financeira.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Reserva de Emergência" />
            </div>
            <div>
              <Label>Ícone</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {emojiOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={`h-10 w-10 rounded-lg flex items-center justify-center text-xl transition-all ${
                      icon === emoji ? 'bg-primary text-primary-foreground ring-2 ring-primary' : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="target">Valor da Meta</Label>
                <Input id="target" type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)} placeholder="30000" />
              </div>
              <div>
                <Label htmlFor="current">Valor Atual</Label>
                <Input id="current" type="number" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)} placeholder="5000" />
              </div>
            </div>
            <div>
              <Label htmlFor="deadline">Prazo</Label>
              <Input id="deadline" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingGoal ? 'Salvar' : 'Adicionar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Meta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir a meta "{goalToDelete?.name}"? Esta ação não pode ser desfeita.
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

export default ManageGoals;
