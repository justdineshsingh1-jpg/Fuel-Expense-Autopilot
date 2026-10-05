const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://isjsbwjxvpmmgwvvksit.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzanNid2p4dnBtbWd3dnZrc2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY1ODUwOSwiZXhwIjoyMTA2MjM0NTA5fQ.ibmxLHoSd6ySCPvVZ8mjSUGe0t8M0eF_u3mJRV8Wbe8'
);

async function check() {
  const { data: users } = await supabase.from('users').select('id').limit(1);
  if (!users || users.length === 0) { console.log("No users"); return; }
  const uid = users[0].id;
  
  const body = {
     user_id: uid,
     approval_status: 'active',
     start_reading: 12345,
     start_capture_timestamp: new Date().toISOString(),
     start_odometer_image_url: 'https://test.com/image.jpg'
  };
  
  body.end_reading = body.start_reading;
  body.end_odometer_image_url = body.start_odometer_image_url;
  body.end_capture_timestamp = body.start_capture_timestamp;
  
  const { data, error } = await supabase.from('trip_logs').insert([body]).select();
  console.log("Insert result:", error || data);
  if (data) {
     await supabase.from('trip_logs').delete().eq('id', data[0].id);
  }
}
check();
