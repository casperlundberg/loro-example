const { LoroDoc } = require('loro-crdt');

console.log('=== Loro CRDT Array Move Operations Example ===\n');

// Create two Loro documents representing different users
const userA = new LoroDoc();
const userB = new LoroDoc();

console.log('1. Setting up initial shared list [A, B, C, D, E]...');

// Initialize the list with elements A, B, C, D, E
const listA = userA.getList('items');
listA.insert(0, 'A');
listA.insert(1, 'B');
listA.insert(2, 'C');
listA.insert(3, 'D');
listA.insert(4, 'E');

console.log('Initial list:', userA.toJSON().items);

// Sync initial state to user B
const initialSnapshot = userA.export({mode: 'snapshot'});
userB.import(initialSnapshot);

console.log('User B receives initial list:', userB.toJSON().items);

console.log('\n2. CONFLICT: Both users try to move element C to different positions...');

// User A: Move element C (at index 2) to the beginning (position 0)
const listARef = userA.getList('items');
listARef.delete(2, 1); // Delete C at position 2
listARef.insert(0, 'C'); // Insert C at position 0

console.log('User A moves C to beginning (position 0):', userA.toJSON().items);

// User B: Move element C (at index 2) to the end
const listBRef = userB.getList('items');
listBRef.delete(2, 1); // Delete C at position 2
listBRef.push('C'); // Insert C at the end

console.log('User B moves C to end:', userB.toJSON().items);

console.log('\n3. CONFLICT: Both users try to move element D to different positions...');

// User A: Move element D to position 1
let currentList = userA.toJSON().items;
let dIndex = currentList.indexOf('D');
console.log(`User A finds D at index ${dIndex}`);
listARef.delete(dIndex, 1); // Delete D
listARef.insert(1, 'D'); // Insert D at position 1

console.log('User A moves D to position 1:', userA.toJSON().items);

// User B: Move element D to position 2
currentList = userB.toJSON().items;
dIndex = currentList.indexOf('D');
console.log(`User B finds D at index ${dIndex}`);
listBRef.delete(dIndex, 1); // Delete D
listBRef.insert(2, 'D'); // Insert D at position 2

console.log('User B moves D to position 2:', userB.toJSON().items);

console.log('\n4. Synchronizing conflicting move operations...');

// Export the current states
const snapshotA = userA.export({mode: 'snapshot'});
const snapshotB = userB.export({mode: 'snapshot'});

// Sync changes
userA.import(snapshotB);
userB.import(snapshotA);

console.log('After sync - User A:', userA.toJSON().items);
console.log('After sync - User B:', userB.toJSON().items);

console.log('\nBoth users converged:', 
  JSON.stringify(userA.toJSON().items) === JSON.stringify(userB.toJSON().items)
);

console.log('\n5. FINAL CONFLICT: Both users try to move element A to different positions...');

// Both users try to move element A to different positions simultaneously
const finalListA = userA.getList('items');
const finalListB = userB.getList('items');

// Get current state for both users
let currentA = userA.toJSON().items;
let currentB = userB.toJSON().items;

console.log('Before final moves:');
console.log('User A sees:', currentA);
console.log('User B sees:', currentB);

// User A: Move A to position 3
let aIndexA = currentA.indexOf('A');
if (aIndexA !== -1) {
  finalListA.delete(aIndexA, 1);
  finalListA.insert(3, 'A');
  console.log(`User A moved A to position 3:`, userA.toJSON().items);
}

// User B: Move A to the end
let aIndexB = currentB.indexOf('A');
if (aIndexB !== -1) {
  finalListB.delete(aIndexB, 1);
  finalListB.push('A');
  console.log(`User B moved A to end:`, userB.toJSON().items);
}

console.log('\nFinal synchronization...');

const finalSnapshotA = userA.export({mode: 'snapshot'});
const finalSnapshotB = userB.export({mode: 'snapshot'});

userA.import(finalSnapshotB);
userB.import(finalSnapshotA);

console.log('\nFinal converged list:');
console.log('User A:', userA.toJSON().items);
console.log('User B:', userB.toJSON().items);

console.log('\nFinal convergence check:', 
  JSON.stringify(userA.toJSON().items) === JSON.stringify(userB.toJSON().items)
);

console.log('\n=== Move Operations Example Complete ===');