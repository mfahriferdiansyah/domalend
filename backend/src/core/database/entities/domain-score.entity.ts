import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('domain_scores')
@Index(['tokenId'])
@Index(['lastUpdated'])
@Index(['domainName']) // Add index for fast domain name lookups
@Index(['domainName', 'lastUpdated']) // Composite index for freshness queries
export class DomainScore {
  @PrimaryColumn()
  tokenId: string;

  @Column()
  domainName: string;

  @Column('int')
  totalScore: number;

  @Column('int')
  ageScore: number;

  @Column('int')
  lengthScore: number;

  @Column('int')
  extensionScore: number;

  @Column('int')
  keywordScore: number;

  @Column('int')
  trafficScore: number;

  @Column('int')
  marketScore: number;

  @Column('int')
  domaScore: number;

  @Column('int')
  confidenceLevel: number;

  @Column('text', { nullable: true })
  reasoning: string; // AI reasoning for the score

  @Column('int', { nullable: true })
  brandScore: number; // Brand component score

  @Column('int', { nullable: true })
  technicalScore: number; // Technical component score

  @Column('int', { nullable: true })
  riskScore: number; // Risk assessment score

  @Column('text', { nullable: true })
  dataSource: string;

  @Column('json', { nullable: true })
  metadata: any; // Store full AI analysis

  @Column('boolean', { default: true })
  isValid: boolean;

  @Column('timestamp', { nullable: true })
  scoreExpiry: Date; // When score should be refreshed

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  lastUpdated: Date;
}