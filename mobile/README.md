# FinançasPro - App React Native

Aplicativo de controle financeiro pessoal construído com React Native + Expo.

## Tecnologias

- **React Native** + **Expo** (SDK 52)
- **React Navigation** (Stack + Bottom Tabs)
- **Zustand** + AsyncStorage (gerenciamento de estado)
- **TypeScript**

## Telas

### Principais (Tab Navigator)
- **Dashboard** – Saldo total, receitas/despesas do mês, transações recentes
- **Transações** – Lista com busca e filtro, excluir com long press ou ícone
- **Contas** – Visualização de todas as contas com saldo consolidado
- **Mais** – Investimentos, metas, atalhos de gerenciamento, configurações

### Gerenciamento (Stack Navigator)
- **Gerenciar Contas** – CRUD completo (adicionar, editar, excluir)
- **Gerenciar Metas** – CRUD com barra de progresso
- **Gerenciar Categorias** – CRUD com seleção de ícone/tipo (receita/despesa)
- **Gerenciar Investimentos** – CRUD com dados de retorno
- **Perfil** – Visualizar e editar dados do usuário
- **Nova Transação** – Formulário modal para adicionar transação
- **Transferência** – Transferir entre contas

## Como rodar

```bash
cd mobile
npm install
npx expo start
```

Escaneie o QR Code com o app **Expo Go** no celular ou pressione `a` para Android / `i` para iOS.

## Estrutura

```
mobile/
├── App.tsx                    # Entry point
├── src/
│   ├── components/            # Componentes reutilizáveis
│   │   ├── BalanceCard.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── FormModal.tsx
│   │   ├── InputField.tsx
│   │   ├── PillButton.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── ScreenHeader.tsx
│   │   └── StatCard.tsx
│   ├── lib/
│   │   └── finance.ts         # Utilidades (formatação, IDs)
│   ├── navigation/
│   │   └── index.tsx           # Navegação (tabs + stack)
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── DashboardScreen.tsx
│   │   ├── TransactionsScreen.tsx
│   │   ├── AccountsScreen.tsx
│   │   ├── MoreScreen.tsx
│   │   ├── ManageAccountsScreen.tsx
│   │   ├── ManageGoalsScreen.tsx
│   │   ├── ManageCategoriesScreen.tsx
│   │   ├── ManageInvestmentsScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── TransactionFormScreen.tsx
│   │   └── TransferScreen.tsx
│   ├── store/
│   │   ├── useAuthStore.ts
│   │   └── useFinanceStore.ts
│   ├── theme/
│   │   ├── colors.ts
│   │   └── ThemeProvider.tsx
│   └── types/
│       └── finance.ts
```
