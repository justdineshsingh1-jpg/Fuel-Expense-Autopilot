import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\lib\offlineSync.ts"
content = """import localforage from 'localforage';
import { supabaseAdmin } from './supabaseAdmin'; // Don't use admin in client, use direct fetch

localforage.config({
  name: 'FuelAutopilot',
  storeName: 'offlineQueue'
});

export interface OfflineTask {
  id: string;
  type: 'trip_start' | 'trip_end' | 'expense';
  payload: any;
  photoBase64: string;
  filename: string;
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

export const clearOfflineTask = async (taskId: string) => {
  let queue: OfflineTask[] = (await localforage.getItem('sync_queue')) || [];
  queue = queue.filter(t => t.id !== taskId);
  await localforage.setItem('sync_queue', queue);
};
"""
with open(path, "w", encoding="utf8") as f:
    f.write(content)
print("Created offlineSync.ts")
