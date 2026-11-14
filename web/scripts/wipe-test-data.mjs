import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://isjsbwjxvpmmgwvvksit.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzanNid2p4dnBtbWd3dnZrc2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY1ODUwOSwiZXhwIjoyMTA2MjM0NTA5fQ.ibmxLHoSd6ySCPvVZ8mjSUGe0t8M0eF_u3mJRV8Wbe8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function wipeTestData() {
  console.log("=== STARTING TEST DATA WIPE ===");

  // 1. Check existing users (Must preserve)
  const { data: users, error: userErr } = await supabase.from('users').select('id, full_name, role, employee_code');
  if (userErr) {
    console.error("Error checking users:", userErr.message);
  } else {
    console.log(`Preserved ${users.length} user accounts:`);
    users.forEach(u => console.log(` - [${u.role}] ${u.full_name} (${u.employee_code})`));
  }

  // 2. Count existing trip logs
  const { count: initialCount } = await supabase.from('trip_logs').select('*', { count: 'exact', head: true });
  console.log(`Current trip_logs count: ${initialCount ?? 0}`);

  // 3. Delete all trip_logs
  // Note: Supabase delete requires a filter condition
  const { error: delErr } = await supabase
    .from('trip_logs')
    .delete()
    .neq('approval_status', 'PERMANENT_RECORD_NEVER_MATCH');

  if (delErr) {
    console.error("Error deleting from trip_logs:", delErr.message);
  } else {
    console.log("Successfully wiped all rows from trip_logs!");
  }

  // 4. Verify trip_logs count is 0
  const { count: finalCount } = await supabase.from('trip_logs').select('*', { count: 'exact', head: true });
  console.log(`Final trip_logs count: ${finalCount ?? 0}`);

  // 5. Clean up Storage bucket files in 'fuel-receipts'
  const folders = ['uploads', 'map_history', 'expenses'];
  for (const folder of folders) {
    try {
      const { data: files, error: listErr } = await supabase.storage.from('fuel-receipts').list(folder, { limit: 1000 });
      if (listErr) {
        console.warn(`Could not list folder ${folder}:`, listErr.message);
        continue;
      }
      if (files && files.length > 0) {
        // Filter out placeholder files if any
        const filePaths = files
          .filter(f => f.name && f.name !== '.emptyFolderPlaceholder')
          .map(f => `${folder}/${f.name}`);
        
        if (filePaths.length > 0) {
          const { error: removeErr } = await supabase.storage.from('fuel-receipts').remove(filePaths);
          if (removeErr) {
            console.error(`Error removing files in ${folder}:`, removeErr.message);
          } else {
            console.log(`Removed ${filePaths.length} test files from fuel-receipts/${folder}`);
          }
        } else {
          console.log(`Folder fuel-receipts/${folder} is already empty.`);
        }
      } else {
        console.log(`Folder fuel-receipts/${folder} is empty.`);
      }
    } catch (e) {
      console.warn(`Exception cleaning folder ${folder}:`, e.message);
    }
  }

  console.log("=== TEST DATA WIPE COMPLETED SUCCESSFULLY ===");
}

wipeTestData().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
