const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://isjsbwjxvpmmgwvvksit.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzanNid2p4dnBtbWd3dnZrc2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY1ODUwOSwiZXhwIjoyMTA2MjM0NTA5fQ.ibmxLHoSd6ySCPvVZ8mjSUGe0t8M0eF_u3mJRV8Wbe8'
);

async function check() {
  const { data: users } = await supabase.from('users').select('id').limit(1);
  if (users && users.length > 0) {
     const uid = users[0].id;
     const payload = {
        user_id: uid,
        approval_status: 'active',
        start_reading: 0,
        end_reading: 0,
        start_capture_timestamp: new Date().toISOString(),
        start_odometer_image_url: 'https://test.com',
        end_odometer_image_url: 'https://test.com',
        end_capture_timestamp: new Date().toISOString()
     };
     const { data, error } = await supabase.from('trip_logs').insert([payload]).select();
     if (data) {
       console.log("Columns:", Object.keys(data[0]));
       // clean up
       await supabase.from('trip_logs').delete().eq('id', data[0].id);
     } else {
       console.log("Error:", error);
     }
  } else {
     console.log("No users found");
  }
}
check();
