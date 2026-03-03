import 'reflect-metadata';
import { container } from 'tsyringe';
import { Pool } from 'pg';
import { pool } from './config/database';

import { UserRepository } from './repositories/UserRepository';
import { AccountRepository } from './repositories/AccountRepository';
import { TransactionRepository } from './repositories/TransactionRepository';
import { CategoryRepository } from './repositories/CategoryRepository';
import { InvestmentRepository } from './repositories/InvestmentRepository';
import { GoalRepository } from './repositories/GoalRepository';
import { RefreshTokenRepository } from './repositories/RefreshTokenRepository';
import { CreditCardRepository } from './repositories/CreditCardRepository';
import { FamilyMemberRepository } from './repositories/FamilyMemberRepository';
import { SharedAccountRepository } from './repositories/SharedAccountRepository';

import { AuthService } from './services/AuthService';
import { AccountService } from './services/AccountService';
import { TransactionService } from './services/TransactionService';
import { CategoryService } from './services/CategoryService';
import { InvestmentService } from './services/InvestmentService';
import { GoalService } from './services/GoalService';
import { CreditCardService } from './services/CreditCardService';

container.register<Pool>('DatabasePool', { useValue: pool });

container.register('UserRepository', { useClass: UserRepository });
container.register('AccountRepository', { useClass: AccountRepository });
container.register('TransactionRepository', { useClass: TransactionRepository });
container.register('CategoryRepository', { useClass: CategoryRepository });
container.register('InvestmentRepository', { useClass: InvestmentRepository });
container.register('GoalRepository', { useClass: GoalRepository });
container.register('RefreshTokenRepository', { useClass: RefreshTokenRepository });
container.register('CreditCardRepository', { useClass: CreditCardRepository });
container.register('FamilyMemberRepository', { useClass: FamilyMemberRepository });
container.register('SharedAccountRepository', { useClass: SharedAccountRepository });

container.register('AuthService', { useClass: AuthService });
container.register('AccountService', { useClass: AccountService });
container.register('TransactionService', { useClass: TransactionService });
container.register('CategoryService', { useClass: CategoryService });
container.register('InvestmentService', { useClass: InvestmentService });
container.register('GoalService', { useClass: GoalService });
container.register('CreditCardService', { useClass: CreditCardService });

export { container };
