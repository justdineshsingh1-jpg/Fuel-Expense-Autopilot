const bcrypt = require('bcryptjs');

async function checkHash() {
  const hash = '$2b$12$hMYVSqELom10Al5guAOTzOBlvdc9f1AKE0oNpKeGKUcJacDeMS9m6';
  const matches = await bcrypt.compare('Admin@123', hash);
  console.log("Does Admin@123 match?", matches);
  
  const hash2 = '$2b$10$oOObCxNh0.yDzZxdh2aK.e2YRz0E2iLzi6p9ft9OQwrG/mPc.EnbO';
  const matches2 = await bcrypt.compare('password123', hash2);
  console.log("Does BCI@... match password123?", matches2);
}
checkHash();
