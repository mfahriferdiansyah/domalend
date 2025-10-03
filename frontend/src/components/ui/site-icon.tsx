import { useState } from 'react';
import Image from 'next/image';

interface SiteIconProps {
  domain: string;
  size?: number;
  className?: string;
}

export const SiteIcon: React.FC<SiteIconProps> = ({ 
  domain, 
  size = 32, 
  className = '' 
}) => {
  const [imageError, setImageError] = useState(false);
  
  // Extract domain name without extensions for fallback
  const getDomainName = (fullDomain: string) => {
    return fullDomain.replace(/\.(com|io|ai|org|net|co|xyz|app)$/i, '');
  };
  
  const domainName = getDomainName(domain);
  const firstLetter = domainName.charAt(0).toUpperCase();
  
  // Try multiple favicon sources
  const faviconSources = [
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`,
    `https://${domain}/favicon.ico`,
    `https://${domain}/favicon.png`,
    `https://favicon.yandex.net/favicon/${domain}`,
  ];

  if (imageError) {
    // Fallback to initial letter with gradient background
    return (
      <div 
        className={`rounded-full bg-gradient-to-r from-blue-500 to-green-500 flex items-center justify-center text-white text-xs font-bold ${className}`}
        style={{ width: size, height: size }}
      >
        {firstLetter}
      </div>
    );
  }

  return (
    <div className={`relative rounded-full overflow-hidden ${className}`} style={{ width: size, height: size }}>
      <Image
        src={faviconSources[0]} // Start with Google's favicon service
        alt={`${domain} icon`}
        width={size}
        height={size}
        className="rounded-full"
        onError={() => setImageError(true)}
        unoptimized // Since we're loading external favicons
      />
    </div>
  );
};

interface DualSiteIconProps {
  primaryDomain: string;
  secondaryDomain: string;
  primarySize?: number;
  secondarySize?: number;
  className?: string;
}

export const DualSiteIcon: React.FC<DualSiteIconProps> = ({
  primaryDomain,
  secondaryDomain,
  primarySize = 32,
  secondarySize = 24,
  className = ''
}) => {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <SiteIcon domain={primaryDomain} size={primarySize} />
      <SiteIcon 
        domain={secondaryDomain} 
        size={secondarySize} 
        className="-ml-2" 
      />
    </div>
  );
};