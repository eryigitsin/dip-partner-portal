// Upload hero video to Supabase Storage
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadHeroVideo() {
  try {
    console.log('🎬 Starting hero video upload...');
    
    // Read the video file
    const videoFile = fs.readFileSync('attached_assets/diptalks1-yan-2_1753542464192.mp4');
    
    // Create public bucket for hero assets if it doesn't exist
    const { data: buckets } = await supabase.storage.listBuckets();
    const heroBucket = buckets?.find(bucket => bucket.name === 'hero-assets');
    
    if (!heroBucket) {
      console.log('📁 Creating hero-assets bucket...');
      const { error: bucketError } = await supabase.storage.createBucket('hero-assets', {
        public: true,
        fileSizeLimit: 52428800, // 50MB limit
        allowedMimeTypes: ['video/mp4', 'video/webm']
      });
      
      if (bucketError) {
        console.error('❌ Error creating bucket:', bucketError);
        return;
      }
    }
    
    // Upload the video file
    console.log('⬆️ Uploading video to Supabase Storage...');
    const { data, error } = await supabase.storage
      .from('hero-assets')
      .upload('hero-background.mp4', videoFile, {
        contentType: 'video/mp4',
        upsert: true
      });
    
    if (error) {
      console.error('❌ Upload error:', error);
      return;
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('hero-assets')
      .getPublicUrl('hero-background.mp4');
    
    console.log('✅ Video uploaded successfully!');
    console.log('🔗 Public URL:', urlData.publicUrl);
    console.log('📝 Update hero-section.tsx with this URL');
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
  }
}

uploadHeroVideo();