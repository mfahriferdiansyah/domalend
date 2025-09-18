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
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
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
    example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
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