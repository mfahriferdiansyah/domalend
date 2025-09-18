import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SubmitScoreByTokenIdDto {
  @ApiProperty({
    description: 'Domain token ID to score and submit',
    example: '54344964066288468101530659531467425324551312134658892013131579195659464473615',
  })
  @IsString()
  @IsNotEmpty()
  tokenId: string;
}

export class SubmitScoreResponseDto {
  @ApiProperty({
    description: 'Whether the submission was successful',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Transaction hash if submission was successful',
    example: '0x1234567890abcdef...',
    required: false,
  })
  txHash?: string;

  @ApiProperty({
    description: 'Calculated domain score',
    example: 85,
    required: false,
  })
  score?: number;

  @ApiProperty({
    description: 'Resolved domain name',
    example: 'example.com',
    required: false,
  })
  domainName?: string;

  @ApiProperty({
    description: 'Whether the score was retrieved from cache',
    example: false,
    required: false,
  })
  cached?: boolean;

  @ApiProperty({
    description: 'Error message if submission failed',
    example: 'Invalid token ID',
    required: false,
  })
  error?: string;

  @ApiProperty({
    description: 'Additional context about the scoring process',
    example: 'Score generated using AI analysis',
    required: false,
  })
  message?: string;
}