const { LoroDoc } = require('loro-crdt');

console.log('=== Loro CRDT Sync Verification Test ===\n');

function verifySync(userA, userB, stageName) {
  const itemsA = userA.toJSON().data;
  const itemsB = userB.toJSON().data;
  
  console.log(`\n--- ${stageName} SYNC VERIFICATION ---`);
  console.log('User A:', itemsA);
  console.log('User B:', itemsB);
  
  // Safety checks
  if (!itemsA || !itemsB) {
    console.log('❌ ERROR: One or both arrays are undefined!');
    return false;
  }
  
  // Check if arrays are identical
  const identicalArrays = JSON.stringify(itemsA) === JSON.stringify(itemsB);
  
  // Check lengths
  const sameLengths = itemsA.length === itemsB.length;
  
  // Element-by-element comparison
  let elementMismatches = [];
  const maxLength = Math.max(itemsA.length, itemsB.length);
  
  for (let i = 0; i < maxLength; i++) {
    if (itemsA[i] !== itemsB[i]) {
      elementMismatches.push({
        index: i,
        userA: itemsA[i] || 'MISSING',
        userB: itemsB[i] || 'MISSING'
      });
    }
  }
  
  console.log(`✓ Identical arrays: ${identicalArrays}`);
  console.log(`✓ Same lengths: ${sameLengths} (A:${itemsA.length}, B:${itemsB.length})`);
  
  if (elementMismatches.length > 0) {
    console.log('❌ ELEMENT MISMATCHES FOUND:');
    elementMismatches.forEach(mismatch => {
      console.log(`  Index ${mismatch.index}: A="${mismatch.userA}" vs B="${mismatch.userB}"`);
    });
  } else {
    console.log('✅ All elements match');
  }
  
  const syncSuccess = identicalArrays && sameLengths && elementMismatches.length === 0;
  console.log(`\n🎯 ${stageName} SYNC RESULT: ${syncSuccess ? '✅ SUCCESS' : '❌ FAILED'}`);
  
  return syncSuccess;
}

// Create two Loro documents
const alice = new LoroDoc();
const bob = new LoroDoc();

console.log('1. Initialize with [W, X, Y, Z]...');

// Use different initial values to avoid any caching
const aliceList = alice.getMovableList('data');
aliceList.insert(0, 'W');
aliceList.insert(1, 'X');
aliceList.insert(2, 'Y');
aliceList.insert(3, 'Z');

console.log('Alice initializes:', alice.toJSON().data);

// Sync initial state
const initSnapshot = alice.export({mode: 'snapshot'});
bob.import(initSnapshot);

console.log('Bob receives:', bob.toJSON().data);
verifySync(alice, bob, 'INITIAL');

console.log('\n2. CONFLICT SCENARIO 1: Move Y to different positions...');

// Alice: Move Y (index 2) to beginning
const aliceListRef = alice.getMovableList('data');
aliceListRef.move(2, 0); // Move Y to position 0
console.log('Alice moves Y to start:', alice.toJSON().data);

// Additional operations by Alice
aliceListRef.insert(2, 'ALICE_INSERT');
aliceListRef.set(3, 'ALICE_MODIFIED_X');
aliceListRef.delete(4, 1); // Delete Z

console.log('Alice after extra ops:', alice.toJSON().data);

// Bob: Move Y (index 2) to end
const bobListRef = bob.getMovableList('data');
bobListRef.move(2, 3); // Move Y to position 3 (end)
console.log('Bob moves Y to end:', bob.toJSON().data);

// Different operations by Bob
bobListRef.insert(1, 'BOB_INSERT');
bobListRef.set(2, 'BOB_MODIFIED_X');
bobListRef.push('BOB_APPEND');

console.log('Bob after extra ops:', bob.toJSON().data);

// First sync
console.log('\n3. FIRST SYNC ATTEMPT...');
const snapshot1A = alice.export({mode: 'snapshot'});
const snapshot1B = bob.export({mode: 'snapshot'});

alice.import(snapshot1B);
bob.import(snapshot1A);

const firstSyncSuccess = verifySync(alice, bob, 'FIRST');

console.log('\n4. CONFLICT SCENARIO 2: Move W to different positions...');

// Both users now operate on the (hopefully) converged state
let currentAlice = alice.toJSON().data;
let currentBob = bob.toJSON().data;

console.log('Alice sees before move:', currentAlice);
console.log('Bob sees before move:', currentBob);

// Alice: Find W and move it
let wIndexAlice = currentAlice.indexOf('W');
if (wIndexAlice !== -1) {
  aliceListRef.move(wIndexAlice, 1); // Move W to position 1
  console.log(`Alice moves W from index ${wIndexAlice} to position 1:`, alice.toJSON().data);
} else {
  console.log('Alice cannot find W!');
}

// More Alice operations
aliceListRef.insert(0, 'SECOND_ALICE');
aliceListRef.set(2, 'MODIFIED_BY_ALICE');

console.log('Alice after second round:', alice.toJSON().data);

// Bob: Find W and move it differently
let wIndexBob = currentBob.indexOf('W');
if (wIndexBob !== -1) {
  let endPos = currentBob.length - 1;
  bobListRef.move(wIndexBob, endPos); // Move W to end
  console.log(`Bob moves W from index ${wIndexBob} to position ${endPos}:`, bob.toJSON().data);
} else {
  console.log('Bob cannot find W!');
}

// More Bob operations
bobListRef.insert(1, 'SECOND_BOB');
bobListRef.delete(2, 1); // Delete something at position 2

console.log('Bob after second round:', bob.toJSON().data);

// Second sync
console.log('\n5. SECOND SYNC ATTEMPT...');
const snapshot2A = alice.export({mode: 'snapshot'});
const snapshot2B = bob.export({mode: 'snapshot'});

alice.import(snapshot2B);
bob.import(snapshot2A);

const secondSyncSuccess = verifySync(alice, bob, 'SECOND');

console.log('\n6. FINAL STRESS: Multiple simultaneous moves...');

// Final complex operations
const finalAlice = alice.getMovableList('data');
const finalBob = bob.getMovableList('data');

let finalStateAlice = alice.toJSON().data;
let finalStateBob = bob.toJSON().data;

console.log('Final Alice state before chaos:', finalStateAlice);
console.log('Final Bob state before chaos:', finalStateBob);

// Alice: Move multiple elements
if (finalStateAlice.length >= 3) {
  finalAlice.move(0, 2); // Move first to position 2
  finalAlice.move(1, 0); // Move second to first
  finalAlice.insert(1, 'CHAOS_A');
  finalAlice.set(3, 'FINAL_ALICE_MOD');
}

// Bob: Different moves on same elements
if (finalStateBob.length >= 3) {
  finalBob.move(0, finalStateBob.length - 1); // Move first to end
  finalBob.move(1, 2); // Move second to position 2
  finalBob.insert(0, 'CHAOS_B');
  finalBob.set(1, 'FINAL_BOB_MOD');
}

console.log('Alice after chaos:', alice.toJSON().data);
console.log('Bob after chaos:', bob.toJSON().data);

// Final sync
console.log('\n7. FINAL SYNC ATTEMPT...');
const snapshotFinalA = alice.export({mode: 'snapshot'});
const snapshotFinalB = bob.export({mode: 'snapshot'});

alice.import(snapshotFinalB);
bob.import(snapshotFinalA);

const finalSyncSuccess = verifySync(alice, bob, 'FINAL');

console.log('\n=== SUMMARY ===');
console.log(`First sync: ${firstSyncSuccess ? '✅' : '❌'}`);
console.log(`Second sync: ${secondSyncSuccess ? '✅' : '❌'}`);
console.log(`Final sync: ${finalSyncSuccess ? '✅' : '❌'}`);

const allSyncsSuccessful = firstSyncSuccess && secondSyncSuccess && finalSyncSuccess;
console.log(`\n🏁 OVERALL RESULT: ${allSyncsSuccessful ? '✅ ALL SYNCS SUCCESSFUL' : '❌ SYNC FAILURES DETECTED'}`);

if (!allSyncsSuccessful) {
  console.log('\n⚠️  NON-DETERMINISTIC BEHAVIOR DETECTED IN LORO MOVABLELIST!');
}

console.log('\n=== Sync Verification Test Complete ===');