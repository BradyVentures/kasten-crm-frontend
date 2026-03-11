import clsx from 'clsx';

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
  bg?: string;
  className?: string;
}

export default function Badge({ children, color, bg, className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium',
      color, bg, className
    )}>
      {children}
    </span>
  );
}
