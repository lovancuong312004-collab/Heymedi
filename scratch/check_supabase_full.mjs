import { createClient } from 'file:///D:/CODE%20L%E1%BB%8E/ui%20ux%20thu%E1%BB%91c/node_modules/@supabase/supabase-js/dist/index.mjs';

const supabase = createClient(
  'https://zyfcivlimujoxrlosshl.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5ZmNpdmxpbXVqb3hybG9zc2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1OTAxNjQsImV4cCI6MjEwNDE2NjE2NH0.aTGWV9I3wN_Zkvbf41kEdgg910gmwLASAWRnlAcwS6s'
);

async function testSupabase() {
  console.log("=== CHECKING STORAGE BUCKET: medication_images ===");
  const { data: buckets, error: bErr } = await supabase.storage.listBuckets();
  if (bErr) {
    console.log("Bucket list error:", bErr.message);
  } else {
    console.log("Available buckets:", buckets?.map(b => `${b.id} (public: ${b.public})`));
  }

  console.log("\n=== CHECKING PROFILES COLUMNS ===");
  const { error: pErr } = await supabase.from('profiles').select('address').limit(1);
  if (pErr) {
    console.log("profiles.address missing?:", pErr.message);
  } else {
    console.log("profiles.address EXISTS!");
  }

  console.log("\n=== CHECKING EMERGENCY_ALERTS TABLE ===");
  const { error: eErr } = await supabase.from('emergency_alerts').select('id').limit(1);
  if (eErr) {
    console.log("emergency_alerts missing?:", eErr.message);
  } else {
    console.log("emergency_alerts EXISTS!");
  }
}

testSupabase();
