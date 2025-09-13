import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('domain_valuations')
@Index(['tokenId'])
@Index(['lastUpdated'])
export class DomainValuation {
  @PrimaryColumn()
  tokenId: string;

  @Column()
  domainName: string;

  @Column('bigint')
  estimatedValue: string; // Store as string to handle large numbers

  @Column('bigint')
  maxLoanAmount: string;

  @Column('int')
  confidenceLevel: number;

  @Column('json')
  factors: string[];

  @Column('json', { nullable: true })
  priceHistory: any;

  @Column('text', { nullable: true })
  valuationMethod: string;

  @Column('boolean', { default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastUpdated: Date;
}