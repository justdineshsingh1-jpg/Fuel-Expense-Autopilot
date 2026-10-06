const bcrypt = require('bcryptjs');

const hash = '/jlBoPIAM5I9b3YVngO';

async function test() {
    console.log("Agent@123:", await bcrypt.compare('Agent@123', hash));
    console.log("password123:", await bcrypt.compare('password123', hash));
}
test();
