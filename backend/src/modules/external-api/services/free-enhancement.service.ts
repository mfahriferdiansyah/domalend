import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface FreeEnhancements {
  pageSpeedScore: number; // 0-100 from Google PageSpeed
  socialMediaPresence: {
    hasTwitter: boolean;
    hasInstagram: boolean;
    hasFacebook: boolean;
    socialScore: number; // 0-100
  };
  dnsHealth: {
    hasValidMX: boolean;
    hasValidNS: boolean;
    ipReputation: 'good' | 'neutral' | 'poor';
    healthScore: number; // 0-100
  };
  certificateStatus: {
    hasSSL: boolean;
    sslGrade: string;
    securityScore: number; // 0-100
  };
}

@Injectable()
export class FreeEnhancementService {
  private readonly logger = new Logger(FreeEnhancementService.name);

  constructor(private readonly httpService: HttpService) {}

  /**
   * Get comprehensive free enhancements for domain scoring
   */
  async getFreeEnhancements(domain: string): Promise<FreeEnhancements> {
    const [pageSpeed, socialMedia, dnsHealth, certificate] = await Promise.allSettled([
      this.getPageSpeedScore(domain),
      this.checkSocialMediaPresence(domain),
      this.checkDNSHealth(domain),
      this.checkCertificateStatus(domain),
    ]);

    return {
      pageSpeedScore: pageSpeed.status === 'fulfilled' ? pageSpeed.value : 50,
      socialMediaPresence: socialMedia.status === 'fulfilled' ? socialMedia.value : {
        hasTwitter: false,
        hasInstagram: false,
        hasFacebook: false,
        socialScore: 0,
      },
      dnsHealth: dnsHealth.status === 'fulfilled' ? dnsHealth.value : {
        hasValidMX: true,
        hasValidNS: true,
        ipReputation: 'neutral',
        healthScore: 70,
      },
      certificateStatus: certificate.status === 'fulfilled' ? certificate.value : {
        hasSSL: false,
        sslGrade: 'F',
        securityScore: 0,
      },
    };
  }

  /**
   * Google PageSpeed Insights API (100% FREE)
   */
  private async getPageSpeedScore(domain: string): Promise<number> {
    try {
      const url = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://${domain}`;
      const response = await firstValueFrom(this.httpService.get(url));
      
      const score = response.data?.lighthouseResult?.categories?.performance?.score;
      return score ? Math.round(score * 100) : 50;
    } catch (error) {
      this.logger.warn(`PageSpeed check failed for ${domain}:`, error.message);
      return 50;
    }
  }

  /**
   * Check social media presence (FREE - no API needed)
   */
  private async checkSocialMediaPresence(domain: string): Promise<{
    hasTwitter: boolean;
    hasInstagram: boolean;
    hasFacebook: boolean;
    socialScore: number;
  }> {
    const sld = domain.split('.')[0];
    
    try {
      // Check if social handles exist (basic HTTP requests)
      const [twitter, instagram, facebook] = await Promise.allSettled([
        this.checkUrlExists(`https://twitter.com/${sld}`),
        this.checkUrlExists(`https://instagram.com/${sld}`),
        this.checkUrlExists(`https://facebook.com/${sld}`),
      ]);

      const hasTwitter = twitter.status === 'fulfilled' && twitter.value;
      const hasInstagram = instagram.status === 'fulfilled' && instagram.value;
      const hasFacebook = facebook.status === 'fulfilled' && facebook.value;

      const socialScore = [hasTwitter, hasInstagram, hasFacebook].filter(Boolean).length * 25;

      return {
        hasTwitter,
        hasInstagram,
        hasFacebook,
        socialScore,
      };
    } catch (error) {
      this.logger.warn(`Social media check failed for ${domain}:`, error.message);
      return {
        hasTwitter: false,
        hasInstagram: false,
        hasFacebook: false,
        socialScore: 0,
      };
    }
  }

  /**
   * DNS Health Check (FREE using public DNS APIs)
   */
  private async checkDNSHealth(domain: string): Promise<{
    hasValidMX: boolean;
    hasValidNS: boolean;
    ipReputation: 'good' | 'neutral' | 'poor';
    healthScore: number;
  }> {
    try {
      // Use Cloudflare's public DNS API
      const dnsResponse = await firstValueFrom(
        this.httpService.get(`https://cloudflare-dns.com/dns-query?name=${domain}&type=A`, {
          headers: { Accept: 'application/dns-json' },
        }),
      );

      const hasValidA = dnsResponse.data?.Answer?.length > 0;
      
      // Check MX records
      const mxResponse = await firstValueFrom(
        this.httpService.get(`https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`, {
          headers: { Accept: 'application/dns-json' },
        }),
      );

      const hasValidMX = mxResponse.data?.Answer?.length > 0;

      let healthScore = 40;
      if (hasValidA) healthScore += 30;
      if (hasValidMX) healthScore += 30;

      return {
        hasValidMX,
        hasValidNS: hasValidA,
        ipReputation: 'neutral', // Would need additional service for IP reputation
        healthScore,
      };
    } catch (error) {
      this.logger.warn(`DNS health check failed for ${domain}:`, error.message);
      return {
        hasValidMX: true,
        hasValidNS: true,
        ipReputation: 'neutral',
        healthScore: 70,
      };
    }
  }

  /**
   * SSL Certificate Check (FREE using SSL Labs API)
   */
  private async checkCertificateStatus(domain: string): Promise<{
    hasSSL: boolean;
    sslGrade: string;
    securityScore: number;
  }> {
    try {
      // Use SSL Labs API (free but rate limited)
      const response = await firstValueFrom(
        this.httpService.get(`https://api.ssllabs.com/api/v3/analyze?host=${domain}&publish=off&startNew=off&all=done`),
      );

      const endpoints = response.data?.endpoints || [];
      if (endpoints.length === 0) {
        return { hasSSL: false, sslGrade: 'F', securityScore: 0 };
      }

      const grade = endpoints[0]?.grade || 'F';
      const hasSSL = grade !== 'F';
      
      const gradeScores: Record<string, number> = {
        'A+': 100,
        'A': 90,
        'A-': 85,
        'B': 75,
        'C': 60,
        'D': 40,
        'E': 20,
        'F': 0,
      };

      return {
        hasSSL,
        sslGrade: grade,
        securityScore: gradeScores[grade] || 0,
      };
    } catch (error) {
      this.logger.warn(`SSL check failed for ${domain}:`, error.message);
      // Fallback: simple HTTPS check
      try {
        await firstValueFrom(this.httpService.head(`https://${domain}`, { timeout: 5000 }));
        return { hasSSL: true, sslGrade: 'A', securityScore: 90 };
      } catch {
        return { hasSSL: false, sslGrade: 'F', securityScore: 0 };
      }
    }
  }

  /**
   * Simple URL existence check
   */
  private async checkUrlExists(url: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.head(url, { 
          timeout: 3000,
          validateStatus: (status) => status < 400,
        }),
      );
      return response.status < 400;
    } catch {
      return false;
    }
  }
}