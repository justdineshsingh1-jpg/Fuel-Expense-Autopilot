const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://isjsbwjxvpmmgwvvksit.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzanNid2p4dnBtbWd3dnZrc2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY1ODUwOSwiZXhwIjoyMTA2MjM0NTA5fQ.ibmxLHoSd6ySCPvVZ8mjSUGe0t8M0eF_u3mJRV8Wbe8'
);

async function wipe() {
  // Delete all trip logs
  const { error: e1 } = await supabase.from('trip_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Trip logs deleted:", e1 ? e1.message : "Success");
  
  // Delete all users except managing director if possible, or just delete all and we will recreate one
  const { error: e2 } = await supabase.from('users').delete().neq('role', 'managing_director');
  console.log("Users deleted:", e2 ? e2.message : "Success");
  
  // Also check if expenses exists
  const { error: e3 } = await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  console.log("Expenses deleted:", e3 ? e3.message : "No table or Success");
}
wipe();
