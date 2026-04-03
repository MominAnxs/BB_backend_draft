import { Laptop, Home, ExternalLink, HeartPulse } from 'lucide-react';

interface StatusBadgeProps {
  status: 'in-office' | 'out-sick' | 'work-from-home' | 'working-outside';
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export function StatusBadge({ status, size = 'sm', showLabel = false }: StatusBadgeProps) {
  const statusConfig = {
    'in-office': {
      color: '#10B981',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-700',
      label: 'In the Office',
      icon: Laptop,
    },
    'out-sick': {
      color: '#F43F5E',
      bgColor: 'bg-rose-50',
      textColor: 'text-rose-700',
      label: 'Out sick',
      icon: HeartPulse,
    },
    'work-from-home': {
      color: '#3B82F6',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700',
      label: 'Working from home',
      icon: Home,
    },
    'working-outside': {
      color: '#F59E0B',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-700',
      label: 'Working outside',
      icon: ExternalLink,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;
  
  const badgeSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const iconSize = size === 'sm' ? 'w-2 h-2' : 'w-2.5 h-2.5';

  if (showLabel) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-caption font-medium ${config.bgColor} ${config.textColor}`}>
        <Icon className={iconSize} />
        <span>{config.label}</span>
      </div>
    );
  }

  return (
    <div 
      className={`${badgeSize} rounded-full border-2 border-white shadow-sm flex items-center justify-center`}
      style={{ backgroundColor: config.color }}
      title={config.label}
    >
      <Icon className={`${iconSize} text-white`} strokeWidth={2.5} />
    </div>
  );
}
