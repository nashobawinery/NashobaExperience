import bcrypt from 'bcrypt';

async function generateHash() {
  const password = 'TempPass123!';
  const saltRounds = 10;
  
  const hash = await bcrypt.hash(password, saltRounds);
  console.log(`Password: ${password}`);
  console.log(`Bcrypt Hash: ${hash}`);
  
  // Verify the hash works
  const isValid = await bcrypt.compare(password, hash);
  console.log(`Verification: ${isValid}`);
}

generateHash().then(() => process.exit(0));
