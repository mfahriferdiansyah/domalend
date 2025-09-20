import { ApiProperty } from '@nestjs/swagger';


export class DomaNFTAttributeDto {
  @ApiProperty({
    description: 'Trait type',
    example: 'TLD',
  })
  trait_type: string;

  @ApiProperty({
    description: 'Trait value',
    example: 'com',
  })
  value: string | number;

  @ApiProperty({
    description: 'Display type for the trait',
    example: 'date',
    required: false,
  })
  display_type?: string;
}

export class DomaNFTDto {
  @ApiProperty({
    description: 'Domain token ID',
    example: '54344964066288468101530659531467425324551312134658892013131579195659464473615',
  })
  tokenId: string;

  @ApiProperty({
    description: 'Owner address',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53',
  })
  owner: string;

  @ApiProperty({
    description: 'Domain name',
    example: 'example.com',
  })
  name: string;

  @ApiProperty({
    description: 'NFT description',
    example: 'Domain Ownership Token',
  })
  description: string;

  @ApiProperty({
    description: 'Image URL',
    example: 'https://cdn-testnet.doma.xyz/tokens/example.png',
  })
  image: string;

  @ApiProperty({
    description: 'External URL',
    example: 'https://dashboard.doma.xyz',
  })
  externalUrl: string;

  @ApiProperty({
    description: 'NFT attributes',
    type: [DomaNFTAttributeDto],
  })
  attributes: DomaNFTAttributeDto[];

  @ApiProperty({
    description: 'Domain expiration date (Unix timestamp)',
    example: 1820826777,
    required: false,
  })
  expirationDate?: number;

  @ApiProperty({
    description: 'Top-level domain',
    example: 'com',
    required: false,
  })
  tld?: string;

  @ApiProperty({
    description: 'Domain character length',
    example: 7,
    required: false,
  })
  characterLength?: number;

  @ApiProperty({
    description: 'Domain registrar',
    example: 'D3 Registrar',
    required: false,
  })
  registrar?: string;
}

export class AddressNFTBalanceDto {
  @ApiProperty({
    description: 'Address queried',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53',
  })
  address: string;

  @ApiProperty({
    description: 'Number of NFTs owned',
    example: 1,
  })
  balance: number;

  @ApiProperty({
    description: 'List of NFTs owned by the address from Doma contract',
    type: [DomaNFTDto],
  })
  ownedNFTs: DomaNFTDto[];

  @ApiProperty({
    description: 'Explanation note',
    example: 'Address owns 1 NFT(s), showing 1 with metadata',
  })
  note: string;
}


export class NFTDetailsResponseDto {
  @ApiProperty({
    description: 'Token ID queried',
    example: '54344964066288468101530659531467425324551312134658892013131579195659464473615',
  })
  tokenId: string;

  @ApiProperty({
    description: 'Whether the NFT exists',
    example: true,
  })
  exists: boolean;

  @ApiProperty({
    description: 'NFT details if exists',
    type: DomaNFTDto,
    required: false,
  })
  nft?: DomaNFTDto;

  @ApiProperty({
    description: 'Whether the domain is expired',
    example: false,
    required: false,
  })
  expired?: boolean;

  @ApiProperty({
    description: 'Error or info message',
    example: 'NFT not found',
    required: false,
  })
  message?: string;
}

export class DomainLoanStatusDto {
  @ApiProperty({
    description: 'Loan ID',
    example: '8'
  })
  loanId: string;

  @ApiProperty({
    description: 'Loan status',
    enum: ['active', 'overdue'],
    example: 'active'
  })
  status: 'active' | 'overdue';

  @ApiProperty({
    description: 'Principal amount in USDC (6 decimals)',
    example: '1000000000'
  })
  principalAmount: string;

  @ApiProperty({
    description: 'Repayment deadline',
    example: '2025-09-19T16:13:58.000Z'
  })
  repaymentDeadline: string;

  @ApiProperty({
    description: 'Days until deadline (negative if overdue)',
    example: 15
  })
  daysUntilDeadline: number;

  @ApiProperty({
    description: 'Loan health score (0-100)',
    example: 85
  })
  healthScore: number;
}

export class DomainAiScoreDto {
  @ApiProperty({
    description: 'AI score (0-100)',
    example: 85
  })
  score: number;

  @ApiProperty({
    description: 'Confidence level (0-1)',
    example: 0.95
  })
  confidence: number;

  @ApiProperty({
    description: 'Last updated timestamp',
    example: '2025-09-20T10:00:00.000Z'
  })
  lastUpdated: string;

  @ApiProperty({
    description: 'Scoring factors breakdown',
    type: 'object',
    properties: {
      age: { type: 'number', example: 20 },
      extension: { type: 'number', example: 15 },
      length: { type: 'number', example: 10 },
      keywords: { type: 'number', example: 20 },
      traffic: { type: 'number', example: 20 }
    }
  })
  factors: {
    age: number;
    extension: number;
    length: number;
    keywords: number;
    traffic: number;
  };
}

export class DomainLoanHistoryDto {
  @ApiProperty({
    description: 'Total number of loans taken against this domain',
    example: 3
  })
  totalLoans: number;

  @ApiProperty({
    description: 'Total amount borrowed against this domain',
    example: '2500000000'
  })
  totalBorrowed: string;

  @ApiProperty({
    description: 'Whether domain is currently collateralized',
    example: true
  })
  currentlyCollateralized: boolean;

  @ApiProperty({
    description: 'Average loan amount',
    example: '833333333'
  })
  averageLoanAmount: string;

  @ApiProperty({
    description: 'Number of successful repayments',
    example: 2
  })
  successfulRepayments: number;

  @ApiProperty({
    description: 'Number of liquidations',
    example: 1
  })
  liquidations: number;
}

export class EnhancedDomainDto extends DomaNFTDto {
  @ApiProperty({
    description: 'Current active loan details',
    type: DomainLoanStatusDto,
    required: false
  })
  currentLoan?: DomainLoanStatusDto;

  @ApiProperty({
    description: 'AI scoring details',
    type: DomainAiScoreDto,
    required: false
  })
  aiScore?: DomainAiScoreDto;

  @ApiProperty({
    description: 'Loan history for this domain',
    type: DomainLoanHistoryDto
  })
  loanHistory: DomainLoanHistoryDto;
}

export class DomainPortfolioSummaryDto {
  @ApiProperty({
    description: 'Total number of domains',
    example: 5
  })
  totalDomains: number;

  @ApiProperty({
    description: 'Number of currently collateralized domains',
    example: 2
  })
  collateralizedDomains: number;

  @ApiProperty({
    description: 'Total value of active collateral',
    example: '3000000000'
  })
  totalCollateralValue: string;

  @ApiProperty({
    description: 'Average AI score across all domains',
    example: 78
  })
  averageAiScore: number;

  @ApiProperty({
    description: 'Total value of active loans',
    example: '1500000000'
  })
  activeLoanValue: string;

  @ApiProperty({
    description: 'Overall portfolio health score (0-100)',
    example: 85
  })
  portfolioHealth: number;

  @ApiProperty({
    description: 'Portfolio risk level',
    enum: ['low', 'medium', 'high'],
    example: 'low'
  })
  riskLevel: 'low' | 'medium' | 'high';
}

export class GetUserDomainsResponseDto {
  @ApiProperty({
    description: 'Address queried',
    example: '0xaba3cf48a81225de43a642ca486c1c069ec11a53'
  })
  address: string;

  @ApiProperty({
    description: 'Enhanced domain list with loan and scoring data',
    type: [EnhancedDomainDto]
  })
  domains: EnhancedDomainDto[];

  @ApiProperty({
    description: 'Portfolio summary and analytics',
    type: DomainPortfolioSummaryDto
  })
  portfolio: DomainPortfolioSummaryDto;
}