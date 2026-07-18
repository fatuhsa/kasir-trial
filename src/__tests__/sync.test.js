import { describe, it, expect } from 'vitest';
import { mergeSyncData } from '../lib/sync';

describe('mergeSyncData', () => {
  it('keeps completely new offline data', () => {
    const cloudData = [{ id: '1', name: 'A' }];
    const localData = [{ id: '1', name: 'A', _synced: true }, { id: '2', name: 'B' }];
    
    // '2' is not in cloud and not synced, so it's a new offline item
    const merged = mergeSyncData(cloudData, localData);
    expect(merged.length).toBe(2);
    expect(merged.find(x => x.id === '2')).toBeDefined();
  });

  it('removes zombie data (synced before but missing in cloud)', () => {
    const cloudData = [{ id: '1', name: 'A' }];
    // '3' was previously synced but is now missing from cloudData (deleted on server)
    const localData = [
      { id: '1', name: 'A', _synced: true },
      { id: '3', name: 'C', _synced: true } 
    ];
    
    const merged = mergeSyncData(cloudData, localData);
    expect(merged.length).toBe(1); // '3' should NOT be resurrected!
    expect(merged.find(x => x.id === '3')).toBeUndefined();
  });

  it('merges with additional offline filtering logic (like active_sessions checking against currentTxns)', () => {
    const cloudData = [{ id: '1', name: 'A' }];
    const localData = [
      { id: '1', name: 'A', _synced: true },
      { id: '4', name: 'D' } // Offline, but let's say it's checked out
    ];
    // customFilter returns true to keep, false to drop
    // '4' is in currentTxns so it should be dropped from sessions
    const customFilter = (item) => item.id !== '4'; 

    const merged = mergeSyncData(cloudData, localData, customFilter);
    expect(merged.length).toBe(1);
    expect(merged.find(x => x.id === '4')).toBeUndefined();
  });
});
