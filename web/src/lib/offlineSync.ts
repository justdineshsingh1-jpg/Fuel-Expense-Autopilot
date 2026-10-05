import localforage from 'localforage';

localforage.config({
  name: 'FuelAutopilot',
  storeName: 'offlineQueue'
});

export interface OfflineTask {
  id: string;
  type: 'start' | 'end' | 'expense';
  payload: any;           // The API payload (/api/trips or /api/expenses)
  photoBase64: string;    // Base64 of the image
  filename: string;       // Image storage filename
  mapData?: any;          // Map JSON for end shift
  mapFilename?: string;   // Map JSON filename
  timestamp: number;
}

export const saveOfflineTask = async (task: OfflineTask) => {
  const queue: OfflineTask[] = (await localforage.getItem('sync_queue')) || [];
  queue.push(task);
  await localforage.setItem('sync_queue', queue);
};

export const getOfflineQueue = async (): Promise<OfflineTask[]> => {
  return (await localforage.getItem('sync_queue')) || [];
};

export const removeOfflineTask = async (taskId: string) => {
  let queue: OfflineTask[] = (await localforage.getItem('sync_queue')) || [];
  queue = queue.filter(t => t.id !== taskId);
  await localforage.setItem('sync_queue', queue);
};

export const getQueueCount = async (): Promise<number> => {
  const queue: OfflineTask[] = (await localforage.getItem('sync_queue')) || [];
  return queue.length;
};
