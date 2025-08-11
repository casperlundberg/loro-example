const { LoroDoc } = require('loro-crdt');

console.log('=== Simple Tree Test ===\n');

try {
  // Create a document
  const doc = new LoroDoc();
  
  // Get tree
  const tree = doc.getTree('test');
  console.log('Tree created successfully');
  
  // Create a single node
  const node1 = tree.createNode();
  console.log('Node 1 created:', node1);
  
  // Check tree structure
  console.log('Tree JSON:', JSON.stringify(doc.toJSON(), null, 2));
  console.log('Tree roots:', tree.roots());
  
  // Create another node
  const node2 = tree.createNode();
  console.log('Node 2 created:', node2);
  
  // Try to move node2 under node1
  console.log('Moving node2 under node1...');
  tree.move(node2, node1);
  
  console.log('Tree after move:', JSON.stringify(doc.toJSON(), null, 2));
  
} catch (error) {
  console.error('Error:', error);
}

console.log('\n=== Simple Tree Test Complete ===');