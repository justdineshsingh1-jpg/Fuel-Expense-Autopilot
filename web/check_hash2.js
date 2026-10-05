const bcrypt = require('bcryptjs');

async function checkHash() {
  const hash2 = '$2b$10$oOObCxNh0.yDzZxdh2aK.e2YRz0E2iLzi6p9ft9OQwrG/mPc.EnbO';
  const matches1 = await bcrypt.compare('Agent@123', hash2);
  const matches2 = await bcrypt.compare('password123', hash2);
  const matches3 = await bcrypt.compare('Admin@123', hash2);
  const matches4 = await bcrypt.compare('123456', hash2);
  
  console.log("Agent@123:", matches1);
  console.log("password123:", matches2);
  console.log("Admin@123:", matches3);
  console.log("123456:", matches4);
}
checkHash();
