import {
  applyDataStoreSnapshot,
  createDataStoreSnapshot,
  DataStoreSnapshot,
} from '../state/dataStore';

let inventoryWriteQueue: Promise<void> = Promise.resolve();

async function withInventoryLock<T>(operation: () => Promise<T>): Promise<T> {
  const previous = inventoryWriteQueue;

  let release!: () => void;
  inventoryWriteQueue = new Promise<void>((resolve) => {
    release = resolve;
  });

  await previous;

  try {
    return await operation();
  } finally {
    release();
  }
}

export async function runInventoryTransaction<T>(
  operation: (snapshot: DataStoreSnapshot) => Promise<T> | T,
): Promise<T> {
  return withInventoryLock(async () => {
    const snapshot = createDataStoreSnapshot();
    const result = await operation(snapshot);

    // Commit only after all validations and mutations succeed on the snapshot.
    applyDataStoreSnapshot(snapshot);

    return result;
  });
}
