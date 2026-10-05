const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://isjsbwjxvpmmgwvvksit.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzanNid2p4dnBtbWd3dnZrc2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY1ODUwOSwiZXhwIjoyMTA2MjM0NTA5fQ.ibmxLHoSd6ySCPvVZ8mjSUGe0t8M0eF_u3mJRV8Wbe8'
);

async function checkUsers() {
  const { data, error } = await supabase.from('users').select('id, email, role, password_hash');
  console.log("Error:", error);
  console.table(data);
}
checkUsers().catch(console.error);
