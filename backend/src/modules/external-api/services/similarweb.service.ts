import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { TrafficMetrics } from './traffic-analysis.service';

export interface SimilarWebTrafficData {
  visits: number;
  bounceRate: number;
  pagesPerVisit: number;
  avgVisitDuration: number;
  trafficSources: {
    direct: number;
    referrals: number;
    search: number;
    social: number;
    mail: number;
    displayAds: number;
  };
}

@Injectable()
export class SimilarwebService {
  private readonly logger = new Logger(SimilarwebService.name);
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.similarweb.com/v1';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get('externalApis.similarweb.apiKey');
  }

  async getDomainMetrics(domain: string): Promise<TrafficMetrics | null> {
    if (!this.apiKey) {
      this.logger.warn('SimilarWeb API key not configured');
      return null;
    }

    try {
      this.logger.log(`Fetching SimilarWeb metrics for: ${domain}`);

      // Get total visits
      const trafficResponse = await this.httpService.axiosRef.get(
        `${this.baseUrl}/website/${domain}/total-traffic-and-engagement/visits`,
        {
          params: {
            api_key: this.apiKey,
            start_date: this.getStartDate(),
            end_date: this.getEndDate(),
            country: 'world',
            granularity: 'monthly',
            main_domain_only: false,
          },
          timeout: 10000,
        }
      );

      const visits = trafficResponse.data?.visits?.[0]?.visits || 0;
      
      // Get traffic sources
      let trafficSources = null;
      try {
        const sourcesResponse = await this.httpService.axiosRef.get(
          `${this.baseUrl}/website/${domain}/traffic-sources/overview-share`,
          {
            params: {
              api_key: this.apiKey,
              start_date: this.getStartDate(),
              end_date: this.getEndDate(),
              country: 'world',
              main_domain_only: false,
            },
            timeout: 10000,
          }
        );
        trafficSources = sourcesResponse.data;
      } catch (error) {
        this.logger.warn(`Could not fetch traffic sources for ${domain}`);
      }

      return {
        monthlyVisitors: visits,
        domainRating: this.calculateDomainRating(visits, trafficSources),
        organicTraffic: this.calculateOrganicTraffic(visits, trafficSources),
        backlinks: 0, // SimilarWeb doesn't provide backlink data
        referringDomains: 0, // Not available
        confidenceScore: 75, // Good confidence for SimilarWeb data
        dataSource: 'similarweb',
      };
    } catch (error) {
      this.logger.error(`SimilarWeb API error for ${domain}:`, error.message);
      return null;
    }
  }

  async getDetailedTrafficData(domain: string): Promise<SimilarWebTrafficData | null> {
    if (!this.apiKey) {
      return null;
    }

    try {
      // Get engagement metrics
      const engagementResponse = await this.httpService.axiosRef.get(
        `${this.baseUrl}/website/${domain}/total-traffic-and-engagement/average-duration`,
        {
          params: {
            api_key: this.apiKey,
            start_date: this.getStartDate(),
            end_date: this.getEndDate(),
            country: 'world',
            granularity: 'monthly',
            main_domain_only: false,
          },
          timeout: 10000,
        }
      );

      // Get bounce rate
      const bounceResponse = await this.httpService.axiosRef.get(
        `${this.baseUrl}/website/${domain}/total-traffic-and-engagement/bounce-rate`,
        {
          params: {
            api_key: this.apiKey,
            start_date: this.getStartDate(),
            end_date: this.getEndDate(),
            country: 'world',
            granularity: 'monthly',
            main_domain_only: false,
          },
          timeout: 10000,
        }
      );

      // Get traffic sources
      const sourcesResponse = await this.httpService.axiosRef.get(
        `${this.baseUrl}/website/${domain}/traffic-sources/overview-share`,
        {
          params: {
            api_key: this.apiKey,
            start_date: this.getStartDate(),
            end_date: this.getEndDate(),
            country: 'world',
            main_domain_only: false,
          },
          timeout: 10000,
        }
      );

      const avgDuration = engagementResponse.data?.average_duration?.[0]?.average_duration || 0;
      const bounceRate = bounceResponse.data?.bounce_rate?.[0]?.bounce_rate || 0;
      const sources = sourcesResponse.data || {};

      return {
        visits: 0, // This would come from the visits endpoint
        bounceRate: bounceRate,
        pagesPerVisit: this.calculatePagesPerVisit(avgDuration, bounceRate),
        avgVisitDuration: avgDuration,
        trafficSources: {
          direct: sources.direct || 0,
          referrals: sources.referrals || 0,
          search: sources.search || 0,
          social: sources.social || 0,
          mail: sources.mail || 0,
          displayAds: sources.display_ads || 0,
        },
      };
    } catch (error) {
      this.logger.error(`SimilarWeb detailed data error for ${domain}:`, error.message);
      return null;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    try {
      // Test with a simple request to a known domain
      const response = await this.httpService.axiosRef.get(
        `${this.baseUrl}/website/google.com/total-traffic-and-engagement/visits`,
        {
          params: {
            api_key: this.apiKey,
            start_date: this.getStartDate(),
            end_date: this.getEndDate(),
            country: 'world',
            granularity: 'monthly',
            main_domain_only: false,
          },
          timeout: 5000,
        }
      );

      return response.status === 200 && response.data?.visits;
    } catch (error) {
      this.logger.error('SimilarWeb health check failed:', error.message);
      return false;
    }
  }

  private getStartDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 3); // 3 months ago
    return date.toISOString().slice(0, 7); // YYYY-MM format
  }

  private getEndDate(): string {
    const date = new Date();
    date.setMonth(date.getMonth() - 1); // 1 month ago
    return date.toISOString().slice(0, 7); // YYYY-MM format
  }

  private calculateDomainRating(visits: number, trafficSources: any): number {
    let rating = 0;
    
    // Visits factor (0-70 points)
    if (visits > 10000000) rating += 70;
    else if (visits > 1000000) rating += 60;
    else if (visits > 100000) rating += 50;
    else if (visits > 10000) rating += 40;
    else if (visits > 1000) rating += 30;
    else if (visits > 100) rating += 20;
    else if (visits > 0) rating += 10;
    
    // Traffic diversity bonus (0-30 points)
    if (trafficSources) {
      const sources = Object.values(trafficSources).filter(v => typeof v === 'number' && v > 0);
      const diversity = sources.length;
      rating += Math.min(30, diversity * 5);
    }
    
    return Math.min(100, rating);
  }

  private calculateOrganicTraffic(visits: number, trafficSources: any): number {
    if (!trafficSources?.search) {
      return Math.round(visits * 0.3); // Assume 30% organic if no data
    }
    
    return Math.round(visits * (trafficSources.search / 100));
  }

  private calculatePagesPerVisit(avgDuration: number, bounceRate: number): number {
    // Estimate pages per visit based on duration and bounce rate
    if (bounceRate > 0.8) return 1.1; // High bounce rate = low pages per visit
    if (bounceRate > 0.6) return 1.5;
    if (bounceRate > 0.4) return 2.0;
    
    // Use duration as additional factor
    if (avgDuration > 300) return 3.0; // 5+ minutes = engaged users
    if (avgDuration > 180) return 2.5; // 3+ minutes
    if (avgDuration > 60) return 2.0;  // 1+ minute
    
    return 1.8;
  }
}