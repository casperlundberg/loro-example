const { LoroDoc } = require('loro-crdt');

console.log('=== Loro CRDT MovableList Move Operations Example ===\n');

// Create two Loro documents representing different users
const userA = new LoroDoc();
const userB = new LoroDoc();

console.log('1. Setting up initial shared MovableList [A, B, C, D, E]...');

// Create MovableList containers instead of regular List
const listA = userA.getMovableList('items');
const listB = userB.getMovableList('items');

// Initialize the list with elements A, B, C, D, E
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
const listARef = userA.getMovableList('items');
listARef.move(2, 0); // Move element at index 2 to position 0

console.log('User A moves C to beginning (position 0):', userA.toJSON().items);

// User B: Move element C (at index 2) to the end (position 4)
const listBRef = userB.getMovableList('items');
listBRef.move(2, 4); // Move element at index 2 to position 4

console.log('User B moves C to end (position 4):', userB.toJSON().items);

console.log('\n3. CONFLICT: Both users try to move element D to different positions...');

// User A: Move element D to position 1
let currentList = userA.toJSON().items;
let dIndex = currentList.indexOf('D');
console.log(`User A finds D at index ${dIndex}`);
listARef.move(dIndex, 1); // Move D to position 1

console.log('User A moves D to position 1:', userA.toJSON().items);

// User B: Move element D to position 2
currentList = userB.toJSON().items;
dIndex = currentList.indexOf('D');
console.log(`User B finds D at index ${dIndex}`);
listBRef.move(dIndex, 2); // Move D to position 2

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

console.log('No duplicates created with native move operations!');

console.log('\n5. FINAL CONFLICT: Both users try to move element A to different positions...');

// Both users try to move element A to different positions simultaneously
const finalListA = userA.getMovableList('items');
const finalListB = userB.getMovableList('items');

// Get current state for both users
let currentA = userA.toJSON().items;
let currentB = userB.toJSON().items;

console.log('Before final moves:');
console.log('User A sees:', currentA);
console.log('User B sees:', currentB);

// User A: Move A to position 3
let aIndexA = currentA.indexOf('A');
if (aIndexA !== -1) {
  finalListA.move(aIndexA, 3);
  console.log(`User A moved A from index ${aIndexA} to position 3:`, userA.toJSON().items);
}

// User B: Move A to the end
let aIndexB = currentB.indexOf('A');
if (aIndexB !== -1) {
  let endPosition = currentB.length - 1;
  finalListB.move(aIndexB, endPosition);
  console.log(`User B moved A from index ${aIndexB} to end (position ${endPosition}):`, userB.toJSON().items);
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

console.log(`\nTotal items in final list: ${userA.toJSON().items.length}`);
console.log('Notice: No duplicates even with concurrent moves on the same elements!');

console.log('\n6. Testing set operation on MovableList...');

// Test the set operation as well
const setListA = userA.getMovableList('items');
const setListB = userB.getMovableList('items');

// Both users try to set different values at the same position
console.log('\nBoth users try to set different values at position 1...');
setListA.set(1, 'X');
setListB.set(1, 'Y');

console.log('User A sets position 1 to X:', userA.toJSON().items);
console.log('User B sets position 1 to Y:', userB.toJSON().items);

// Sync set operations
const setSnapshotA = userA.export({mode: 'snapshot'});
const setSnapshotB = userB.export({mode: 'snapshot'});

userA.import(setSnapshotB);
userB.import(setSnapshotA);

console.log('\nAfter syncing set operations:');
console.log('User A:', userA.toJSON().items);
console.log('User B:', userB.toJSON().items);

console.log('\n=== MovableList Move Operations Example Complete ===');