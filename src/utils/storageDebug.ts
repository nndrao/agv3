/**
 * Debug utility to check storage persistence across OpenFin views
 */
export function debugStorage(context: string) {
  console.log(`[Storage Debug - ${context}]`);
  console.log('Current URL:', window.location.href);
  console.log('Origin:', window.location.origin);
  console.log('Protocol:', window.location.protocol);
  console.log('Host:', window.location.host);
  console.log('Pathname:', window.location.pathname);
  
  // Check localStorage
  console.log('localStorage available:', typeof(Storage) !== "undefined");
  console.log('localStorage length:', localStorage.length);
  
  // List all keys
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      keys.push(key);
    }
  }
  console.log('localStorage keys:', keys);
  
  // Check for our specific keys
  const viewInstanceKeys = keys.filter(k => k.includes('datagrid-stomp'));
  console.log('DataGrid STOMP keys:', viewInstanceKeys);
  
  // Check OpenFin context
  if (typeof fin !== 'undefined') {
    console.log('OpenFin available: YES');
    fin.System.getVersion().then(version => {
      console.log('OpenFin version:', version);
    });
  } else {
    console.log('OpenFin available: NO');
  }
}