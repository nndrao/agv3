# Phase 4: Testing & Verification Checklist

## 🧪 Testing Instructions

### 1. Open Test Suite
Open `test-configuration-service.html` in your browser to run automated tests.

### 2. Manual Testing Steps

#### A. Verify Migration
1. Open DevTools → Application → IndexedDB
2. Check for two databases:
   - `agv3-storage` (old, should have existing configs)
   - `agv3-configuration` (new, should have migrated configs)
3. In Console, run:
```javascript
localStorage.getItem('agv3-config-migration-v1')
// Should return: 'completed'
```

#### B. Test Configuration Service
1. Open the main application
2. Open DevTools Console
3. Test basic operations:
```javascript
// Import the client
import { CentralizedStorageClient } from './src/services/configuration/ConfigurationClientAdapter.js';

// Test create
const testConfig = {
  configId: 'test-' + Date.now(),
  appId: 'agv3',
  userId: 'test',
  componentType: 'test',
  name: 'Test Config',
  config: { test: true },
  settings: [],
  activeSetting: 'default',
  createdBy: 'test',
  lastUpdatedBy: 'test',
  creationTime: new Date(),
  lastUpdated: new Date()
};

const id = await CentralizedStorageClient.save(testConfig);
console.log('Created:', id);

// Test read
const retrieved = await CentralizedStorageClient.get(id);
console.log('Retrieved:', retrieved);

// Test update
await CentralizedStorageClient.update(id, { name: 'Updated Test' });

// Test query
const results = await CentralizedStorageClient.query({ componentType: 'test' });
console.log('Query results:', results);

// Test delete
await CentralizedStorageClient.delete(id);
```

#### C. Test Cross-Window Sync
1. Open two DataGrid windows
2. In Window 1, create or modify a profile
3. In Window 2, verify the profile is immediately available
4. Test operations:
   - Create profile in Window 1 → Should appear in Window 2
   - Edit profile in Window 1 → Changes visible in Window 2
   - Delete profile in Window 1 → Should disappear from Window 2

#### D. Test Profile Management
1. Open a DataGrid window
2. Test profile operations:
   - Create new profile
   - Save profile changes
   - Load different profile
   - Delete profile
3. Verify all operations use centralized storage

#### E. Performance Testing
1. Monitor Network tab for IAB channel messages
2. Check Console for any errors or warnings
3. Verify operations complete quickly (< 100ms for most operations)

## ✅ Verification Checklist

### Database Verification
- [ ] `agv3-configuration` database exists
- [ ] `agv3-configuration` contains migrated configs
- [ ] No new data being written to `agv3-storage`
- [ ] Migration flag is set to 'completed'

### Functionality Verification
- [ ] Configuration Service connects successfully
- [ ] CRUD operations work correctly
- [ ] Cross-window configuration access works
- [ ] Profile management uses centralized storage
- [ ] Window manager uses centralized storage
- [ ] App variables use centralized storage

### Performance Verification
- [ ] Configuration operations < 100ms
- [ ] No memory leaks detected
- [ ] IAB channel traffic is reasonable
- [ ] No console errors during normal operation

### Backward Compatibility
- [ ] Existing profiles still work
- [ ] No data loss after migration
- [ ] Fallback to StorageClient works if service unavailable

## 🐛 Known Issues to Check

1. **Import Error**: Fixed - Was using wrong export name `CentralizedConfigStorage` instead of `CentralizedStorageClient`

2. **Migration Running Multiple Times**: Check that migration only runs once

3. **Channel Connection Issues**: Verify Configuration Service channel connects properly

## 📊 Expected Results

### After Successful Migration:
- All configs in `agv3-configuration` database
- Cross-window sync working
- No performance degradation
- No data loss

### Performance Benchmarks:
- Create: < 50ms
- Read: < 20ms
- Update: < 50ms
- Delete: < 30ms
- Query: < 100ms for 100 records

## 🔧 Troubleshooting

### If Migration Fails:
1. Check browser console for errors
2. Verify IndexedDB permissions
3. Clear localStorage flag and retry:
```javascript
localStorage.removeItem('agv3-config-migration-v1');
window.location.reload();
```

### If Configuration Service Not Connecting:
1. Check if provider is running
2. Verify OpenFin IAB is available
3. Check for channel name conflicts
4. Look for errors in console

### If Cross-Window Sync Not Working:
1. Verify both windows use same Configuration Service
2. Check IAB channel subscriptions
3. Ensure no cache issues

## 📝 Test Results Log

Record your test results here:

| Test | Status | Notes |
|------|--------|-------|
| Migration | ⏳ | |
| CRUD Operations | ⏳ | |
| Cross-Window Sync | ⏳ | |
| Profile Management | ⏳ | |
| Performance | ⏳ | |

## Next Steps After Testing

1. **If All Tests Pass**: 
   - Mark Phase 4 as complete
   - Plan production deployment
   - Create user documentation

2. **If Issues Found**:
   - Document specific failures
   - Fix critical issues
   - Re-run affected tests

3. **Performance Optimization** (if needed):
   - Add caching layer
   - Implement batch operations
   - Optimize query patterns