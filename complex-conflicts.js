const { LoroDoc } = require('loro-crdt');

console.log('=== Loro CRDT Complex Conflict Resolution Example ===\n');

// Create two Loro documents representing different users
const userA = new LoroDoc();
const userB = new LoroDoc();

console.log('1. Setting up initial shared MovableList [A, B, C, D, E]...');

// Create MovableList containers
const listA = userA.getMovableList('items');

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

console.log('\n2. MOVE CONFLICT + Additional Operations...');

// User A: Move element C (at index 2) to the beginning (position 0)
const listARef = userA.getMovableList('items');
listARef.move(2, 0); // Move C to position 0
console.log('User A moves C to beginning:', userA.toJSON().items);

// User A: Additional operations after the move
listARef.insert(2, 'X'); // Insert X at position 2
listARef.set(3, 'Modified_D'); // Modify D to "Modified_D"
listARef.delete(4, 1); // Delete element at position 4 (E)
console.log('User A after additional ops:', userA.toJSON().items);

// User B: Move element C (at index 2) to the end
const listBRef = userB.getMovableList('items');
listBRef.move(2, 4); // Move C to position 4
console.log('User B moves C to end:', userB.toJSON().items);

// User B: Additional conflicting operations
listBRef.insert(1, 'Y'); // Insert Y at position 1
listBRef.set(2, 'Changed_B'); // Modify what was B to "Changed_B"
listBRef.delete(3, 1); // Delete element at position 3 (D)
listBRef.insert(3, 'Z'); // Insert Z where D was
console.log('User B after additional ops:', userB.toJSON().items);

console.log('\n3. First sync - resolving move + operation conflicts...');
const snapshot1A = userA.export({mode: 'snapshot'});
const snapshot1B = userB.export({mode: 'snapshot'});

userA.import(snapshot1B);
userB.import(snapshot1A);

console.log('After first sync - User A:', userA.toJSON().items);
console.log('After first sync - User B:', userB.toJSON().items);
console.log('Converged after first sync:', 
  JSON.stringify(userA.toJSON().items) === JSON.stringify(userB.toJSON().items)
);

console.log('\n4. SECOND MOVE CONFLICT + More Operations...');

// Both users now work on the converged list
// User A: Move first element to position 2
let currentA = userA.toJSON().items;
if (currentA.length > 0) {
  listARef.move(0, 2);
  console.log(`User A moves first element (${currentA[0]}) to position 2:`, userA.toJSON().items);
}

// User A: Chain of additional operations
listARef.insert(0, 'P'); // Insert P at beginning
listARef.set(1, 'UPDATED_1'); // Update element at position 1
listARef.push('Q'); // Add Q to end
console.log('User A after chaining ops:', userA.toJSON().items);

// User B: Move the same element that User A moved, but to a different position
let currentB = userB.toJSON().items;
if (currentB.length > 2) {
  // Find the element that User A moved and move it elsewhere
  let targetElement = currentA[0]; // The element User A moved
  let targetIndex = currentB.indexOf(targetElement);
  if (targetIndex !== -1) {
    listBRef.move(targetIndex, currentB.length - 1); // Move to end
    console.log(`User B moves ${targetElement} from index ${targetIndex} to end:`, userB.toJSON().items);
  }
}

// User B: Different chain of operations
listBRef.insert(1, 'R'); // Insert R at position 1
listBRef.delete(2, 1); // Delete element at position 2
listBRef.set(0, 'CHANGED_0'); // Update first element
listBRef.insert(3, 'S'); // Insert S at position 3
console.log('User B after chaining ops:', userB.toJSON().items);

console.log('\n5. Second sync - complex conflict resolution...');
const snapshot2A = userA.export({mode: 'snapshot'});
const snapshot2B = userB.export({mode: 'snapshot'});

userA.import(snapshot2B);
userB.import(snapshot2A);

console.log('After second sync - User A:', userA.toJSON().items);
console.log('After second sync - User B:', userB.toJSON().items);

console.log('\n6. FINAL STRESS TEST: Simultaneous operations on multiple elements...');

// Both users perform multiple operations simultaneously
const finalListA = userA.getMovableList('items');
const finalListB = userB.getMovableList('items');

// User A: Complex sequence
let finalCurrentA = userA.toJSON().items;
if (finalCurrentA.length >= 3) {
  finalListA.move(0, 2); // Move first to position 2
  finalListA.move(1, 0); // Move what's now at position 1 to beginning
  finalListA.set(2, 'FINAL_A'); // Set position 2
  finalListA.insert(1, 'INSERT_A'); // Insert at position 1
  finalListA.delete(finalCurrentA.length - 1, 1); // Delete last element
}
console.log('User A final operations:', userA.toJSON().items);

// User B: Different complex sequence on the same positions
let finalCurrentB = userB.toJSON().items;
if (finalCurrentB.length >= 3) {
  finalListB.move(0, finalCurrentB.length - 1); // Move first to end
  finalListB.set(0, 'FINAL_B'); // Set new first element
  finalListB.insert(2, 'INSERT_B'); // Insert at position 2
  finalListB.move(1, 3); // Move element from position 1 to 3
  finalListB.delete(0, 1); // Delete first element
}
console.log('User B final operations:', userB.toJSON().items);

console.log('\n7. Final synchronization...');
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

console.log(`\nFinal list length: ${userA.toJSON().items.length}`);
console.log('Complex conflict resolution completed successfully!');

console.log('\n=== Complex Conflict Resolution Example Complete ===');