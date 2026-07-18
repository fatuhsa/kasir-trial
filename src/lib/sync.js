export function mergeSyncData(cloudData, localData, customFilter = () => true) {
  const dbIds = new Set(cloudData.map(item => item.id));
  return [...cloudData, ...localData.filter(item => !dbIds.has(item.id) && !item._synced && customFilter(item))];
}
