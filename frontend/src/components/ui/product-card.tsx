import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface ProductCardProps {
  badge: {
    text: string;
    variant: 'green' | 'orange' | 'blue' | 'purple';
  };
  title: string;
  description: string;
  illustration: React.ReactNode;
}

const badgeVariants = {
  green: 'bg-white text-black border-gray-200',
  orange: 'bg-white text-black border-gray-200',
  blue: 'bg-white text-black border-gray-200',
  purple: 'bg-white text-black border-gray-200',
};

const dotVariants = {
  green: 'bg-green-500',
  orange: 'bg-orange-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
};

const hoverBackgroundVariants = {
  green: 'hover:bg-green-100',
  orange: 'hover:bg-orange-100',
  blue: 'hover:bg-blue-100',
  purple: 'hover:bg-purple-100',
};

export function ProductCard({ badge, title, description, illustration }: ProductCardProps) {
  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-shadow duration-300 border-none bg-gray-50 shadow-sm">
      <CardContent className="p-3">
        {/* Visual Element with White Card Wrapper */}
        <div className="relative mb-3">
          <div className={`bg-white rounded-2xl p-3 shadow-sm border border-gray-100 h-64 flex flex-col transition-colors duration-300 ${hoverBackgroundVariants[badge.variant]} group cursor-pointer`}>
            <div className="flex justify-end items-start mb-2">
              <Badge className={`${badgeVariants[badge.variant]} text-sm font-medium px-3 py-1 flex items-center gap-2`}>
                <div className={`w-2 h-2 rounded-full ${dotVariants[badge.variant]}`}></div>
                {badge.text}
              </Badge>
            </div>

            <div className="flex justify-center items-center flex-1">
              <div className="transition-transform duration-300 group-hover:scale-110">
                {illustration}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-start px-3">
          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900 mb-1">
              {title}
            </h3>
            <p className="text-gray-600 text-base leading-relaxed pr-4">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}