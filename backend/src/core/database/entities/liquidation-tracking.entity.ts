import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('liquidation_tracking')
@Index(['status'])
@Index(['dueDate'])
@Index(['status', 'dueDate'])
@Index(['lastCheckTimestamp'])
export class LiquidationTracking {
  @PrimaryColumn()
  loanId: string;

  @Column()
  borrower: string;

  @Column()
  domainTokenId: string;

  @Column({ nullable: true })
  domainName: string;

  @Column('text')
  principalAmount: string;

  @Column('text')
  totalOwed: string;

  @Column('int', { nullable: true })
  interestRate: number;

  @Column('timestamp')
  dueDate: Date;

  @Column({ default: 'pending' })
  status: 'pending' | 'liquidated' | 'failed' | 'expired' | 'repaid';

  @Column('int', { default: 0 })
  liquidationAttempts: number;

  @Column('timestamp', { nullable: true })
  lastCheckTimestamp: Date;

  @Column({ nullable: true })
  liquidationTxHash: string;

  @Column({ nullable: true })
  auctionId: string;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  poolId: string;

  @Column({ nullable: true })
  requestId: string;

  @Column('boolean', { default: false })
  isDefault: boolean;

  @Column({ nullable: true })
  ponderEventId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}