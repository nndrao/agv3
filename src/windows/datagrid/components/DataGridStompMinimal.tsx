import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

export function DataGridStompMinimal() {
  const [status, setStatus] = useState('Loading...');
  
  useEffect(() => {
    console.log('[DataGridStompMinimal] Component mounted');
    setStatus('Ready');
    
    // Get instance ID from URL
    const params = new URLSearchParams(window.location.search);
    const instanceId = params.get('id');
    console.log('[DataGridStompMinimal] Instance ID:', instanceId);
  }, []);
  
  return (
    <div className="h-screen w-screen p-4">
      <div className="bg-background border rounded-lg p-4">
        <h1 className="text-2xl font-bold mb-4">DataGrid STOMP (Minimal Test)</h1>
        <p className="text-muted-foreground mb-4">Status: {status}</p>
        <p className="text-sm">This is a minimal version to test if the component loads without resource errors.</p>
        
        <div className="mt-4">
          <Button onClick={() => console.log('Test button clicked')}>
            Test Button
          </Button>
        </div>
      </div>
    </div>
  );
}