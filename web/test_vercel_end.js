const payload = {
  user_id: "ec91f7e3-7b11-410d-aad6-d437662adb4c",
  approval_status: 'completed',
  end_reading: 200,
  end_capture_timestamp: new Date().toISOString(),
  end_odometer_image_url: 'https://isjsbwjxvpmmgwvvksit.supabase.co/storage/v1/object/public/fuel-receipts/odometer/1791193973207.jpg'
};

async function check() {
  const res = await fetch('https://fuel-expense-autopilot.vercel.app/api/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text();
  console.log("Status:", res.status);
  console.log("Response:", text);
}
check();
