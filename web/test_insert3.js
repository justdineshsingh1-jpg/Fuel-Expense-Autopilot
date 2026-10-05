const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://isjsbwjxvpmmgwvvksit.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlzanNid2p4dnBtbWd3dnZrc2l0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDY1ODUwOSwiZXhwIjoyMTA2MjM0NTA5fQ.ibmxLHoSd6ySCPvVZ8mjSUGe0t8M0eF_u3mJRV8Wbe8'
);

async function check() {
  const payload = {
    user_id: '98765432-1234-5678-1234-567812345678', // UUID format
    approval_status: 'active',
    start_reading: 100,
    end_reading: 100, // satisfy constraint
    start_capture_timestamp: new Date().toISOString(),
    start_odometer_image_url: 'https://test.com',
    end_odometer_image_url: 'https://test.com',
    end_capture_timestamp: new Date().toISOString()
  };
  const { data, error } = await supabase.from('trip_logs').insert([payload]).select();
  console.log("Insert result:", error || data);
}
check();
