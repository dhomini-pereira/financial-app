import 'reflect-metadata';
import { container } from 'tsyringe';
import { Pool } from 'pg';
import { pool } from './config/database';

// Repositories
import { UserRepository } from './repositories/UserRepository';
import { AccountRepository } from './repositories/AccountRepository';
import { TransactionRepository } from './repositories/TransactionRepository';
import { CategoryRepository } from './repositories/CategoryRepository';
import { InvestmentRepository } from './repositories/InvestmentRepository';
import { GoalRepository } from './repositories/GoalRepository';
import { RefreshTokenRepository } from './repositories/RefreshTokenRepository';

// Services
import { AuthService } from './services/AuthService';
import { AccountService } from './services/AccountService';
import { TransactionService } from './services/TransactionService';
import { CategoryService } from './services/CategoryService';
import { InvestmentService } from './services/InvestmentService';
import { GoalService } from './services/GoalService';

// Register database pool
container.register<Pool>('DatabasePool', { useValue: pool });

// Register repositories
container.register('UserRepository', { useClass: UserRepository });
container.register('AccountRepository', { useClass: AccountRepository });
container.register('TransactionRepository', { useClass: TransactionRepository });
container.register('CategoryRepository', { useClass: CategoryRepository });
container.register('InvestmentRepository', { useClass: InvestmentRepository });
container.register('GoalRepository', { useClass: GoalRepository });
container.register('RefreshTokenRepository', { useClass: RefreshTokenRepository });

// Register services
container.register('AuthService', { useClass: AuthService });
container.register('AccountService', { useClass: AccountService });
container.register('TransactionService', { useClass: TransactionService });
container.register('CategoryService', { useClass: CategoryService });
container.register('InvestmentService', { useClass: InvestmentService });
container.register('GoalService', { useClass: GoalService });

export { container };
