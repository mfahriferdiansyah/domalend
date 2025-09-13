import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('scoring_history')
@Index(['tokenId', 'createdAt'])
@Index(['createdAt'])
export class ScoringHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  tokenId: string;

  @Column()
  domainName: string;

  @Column('int')
  totalScore: number;

  @Column('bigint')
  estimatedValue: string;

  @Column('int')
  confidenceLevel: number;

  @Column('text')
  action: string; // 'score_update', 'valuation_update', 'blockchain_sync'

  @Column('json', { nullable: true })
  scoreBreakdown: any;

  @Column('text', { nullable: true })
  dataSource: string;

  @Column('text', { nullable: true })
  transactionHash: string;

  @Column('boolean')
  success: boolean;

  @Column('text', { nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;
}