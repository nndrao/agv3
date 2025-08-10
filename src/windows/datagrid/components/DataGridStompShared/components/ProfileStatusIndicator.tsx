import React, { useEffect, useState } from 'react';
import { 
  Loader2, 
  Save, 
  Download, 
  Upload,
  Settings,
  AlertCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ProfileOperation = 
  | 'idle'
  | 'saving'
  | 'loading'
  | 'applying'
  | 'switching'
  | 'importing'
  | 'exporting'
  | 'error';

interface ProfileStatusIndicatorProps {
  operation: ProfileOperation;
  profileName?: string;
  error?: string;
  className?: string;
}

const operationConfig = {
  idle: {
    icon: null,
    text: '',
    color: '',
    animate: false
  },
  saving: {
    icon: Save,
    text: 'Saving',
    color: 'text-blue-500',
    animate: true
  },
  loading: {
    icon: Download,
    text: 'Loading',
    color: 'text-blue-500',
    animate: true
  },
  applying: {
    icon: Settings,
    text: 'Applying',
    color: 'text-blue-500',
    animate: true
  },
  switching: {
    icon: Loader2,
    text: 'Switching to',
    color: 'text-blue-500',
    animate: true
  },
  importing: {
    icon: Upload,
    text: 'Importing',
    color: 'text-blue-500',
    animate: true
  },
  exporting: {
    icon: Download,
    text: 'Exporting',
    color: 'text-blue-500',
    animate: true
  },
  error: {
    icon: AlertCircle,
    text: 'Failed',
    color: 'text-red-500',
    animate: false
  }
};

export const ProfileStatusIndicator: React.FC<ProfileStatusIndicatorProps> = ({
  operation,
  profileName,
  error,
  className
}) => {
  // Initialize visible based on the initial operation prop
  const [visible, setVisible] = useState(operation !== 'idle');
  const [displayOperation, setDisplayOperation] = useState<ProfileOperation>(operation);
  
  
  useEffect(() => {
    if (operation === 'idle') {
      // Hide immediately when idle
      setVisible(false);
    } else {
      setDisplayOperation(operation);
      setVisible(true);
      
      // Auto-hide error after 2 seconds
      if (operation === 'error') {
        const timer = setTimeout(() => {
          setVisible(false);
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [operation]);
  
  const config = operationConfig[displayOperation];
  const Icon = config.icon;
  
  if (!Icon || !visible) {
    return null;
  }
  
  // Format the status text based on the operation
  let statusText: string;
  if (displayOperation === 'switching') {
    statusText = 'Loading profile...';
  } else if (displayOperation === 'saving') {
    statusText = 'Saving profile...';
  } else if (displayOperation === 'loading') {
    statusText = 'Loading profile...';
  } else if (displayOperation === 'applying') {
    statusText = 'Loading profile...';
  } else {
    statusText = config.text + (profileName ? ` "${profileName}"` : ' profile');
  }
  
  const displayText = operation === 'error' && error ? error : statusText;
  
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-md',
        'bg-background/50 backdrop-blur-sm border border-border/50',
        'transition-all duration-300 ease-in-out',
        'animate-in fade-in slide-in-from-top-1',
        visible ? 'opacity-100' : 'opacity-0',
        className
      )}
    >
      <Icon 
        className={cn(
          'h-3.5 w-3.5',
          config.color,
          config.animate && 'animate-spin'
        )} 
      />
      <span className={cn(
        'text-xs font-medium',
        config.color
      )}>
        {displayText}
      </span>
    </div>
  );
};

// Hook to manage profile status
export function useProfileStatus() {
  const [operation, setOperation] = useState<ProfileOperation>('idle');
  const [profileName, setProfileName] = useState<string>('');
  const [error, setError] = useState<string>('');
  
  const startOperation = (op: ProfileOperation, name?: string) => {
    setOperation(op);
    setProfileName(name || '');
    setError('');
  };
  
  const completeOperation = (success: boolean = true, errorMsg?: string) => {
    if (success) {
      // If successful, just hide immediately without showing "Done"
      setOperation('idle');
      setProfileName('');
      setError('');
    } else {
      // Only show error state if there was a failure
      setOperation('error');
      if (errorMsg) {
        setError(errorMsg);
      }
      
      // Reset error after delay
      setTimeout(() => {
        setOperation('idle');
        setProfileName('');
        setError('');
      }, 2500);
    }
  };
  
  const isOperationInProgress = () => {
    return operation !== 'idle' && operation !== 'error';
  };
  
  return {
    operation,
    profileName,
    error,
    startOperation,
    completeOperation,
    isOperationInProgress
  };
}