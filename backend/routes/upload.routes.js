const express = require('express');
const router = express.Router();
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const authenticate = require('../middleware/auth.middleware');

// Configure multer to use memory storage (file stays in RAM temporarily)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5 MB max
});

router.use(authenticate);

// POST /api/upload/profile-photo
router.post('/profile-photo', upload.single('photo'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        // Create a Supabase client with the service role key (has full storage access)
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!supabaseUrl || !supabaseServiceKey) {
            return res.status(500).json({ success: false, message: 'Supabase configuration missing' });
        }

        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

        // Generate a unique file name
        const fileExtension = req.file.originalname.split('.').pop();
        const fileName = `avatars/${req.user.id}_${Date.now()}.${fileExtension}`;

        // Upload to Supabase Storage (bucket 'avatars' must exist)
        const { error: uploadError } = await supabaseClient.storage
            .from('avatars')
            .upload(fileName, req.file.buffer, {
                contentType: req.file.mimetype,
                upsert: true
            });

        if (uploadError) {
            console.error('Storage upload error:', uploadError);
            return res.status(500).json({ success: false, message: 'Upload to storage failed' });
        }

        // Get the public URL
        const { data: publicUrlData } = supabaseClient.storage
            .from('avatars')
            .getPublicUrl(fileName);

        const publicUrl = publicUrlData.publicUrl;

        // Update the user's profile_photo in the database
        const supabaseAdmin = require('../config/supabase');
        const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ profile_photo: publicUrl })
            .eq('id', req.user.id);

        if (updateError) {
            console.error('User photo update error:', updateError);
            return res.status(500).json({ success: false, message: 'Failed to update user record' });
        }

        return res.status(200).json({ success: true, data: { url: publicUrl } });
    } catch (error) {
        console.error('Upload error:', error);
        return res.status(500).json({ success: false, message: 'Upload failed' });
    }
});

module.exports = router;
