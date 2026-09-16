const { Storage } = require('megajs');
async function test() {
  console.log('Testing anonymous mega upload...');
  const storage = await new Storage({ keepalive: false }).ready;
  console.log('Storage ready.');
  const file = await storage.upload('test.txt', Buffer.from('hello world')).complete;
  console.log('File uploaded.');
  const link = await file.link();
  console.log('Link:', link);
}
test().catch(console.error);
