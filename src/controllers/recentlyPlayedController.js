const supabase = require('../config/supabaseClient');

exports.addToRecentlyPlayed = async (req, res, next) => {
    try {
        const { user_id, item_id, item_data } = req.body;

        if (!user_id || !item_id) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // 1. Upsert the track (insert or update played_at)
        const { error: upsertError } = await supabase
            .from('recently_played')
            .upsert({
                user_id,
                item_id,
                item_data: item_data || {},
                played_at: new Date().toISOString()
            }, {
                onConflict: 'user_id, item_id'
            });

        if (upsertError) throw upsertError;

        // 2. Prune old records (Keep top 50)
        // Fetch IDs of items BEYOND the top 50 (index 50 is the 51st item)
        // Using a large upper limit to ensure we catch all older records regardless of how many exist
        const { data: recordsToDelete, error: fetchError } = await supabase
            .from('recently_played')
            .select('id')
            .eq('user_id', user_id)
            .order('played_at', { ascending: false })
            .range(50, 9999); 

        if (fetchError) throw fetchError;

        if (recordsToDelete && recordsToDelete.length > 0) {
            const idsToDelete = recordsToDelete.map(r => r.id);
            const { error: deleteError } = await supabase
                .from('recently_played')
                .delete()
                .in('id', idsToDelete);

            if (deleteError) console.error('Error pruning recently played:', deleteError);
        }

        res.status(200).json({ success: true });
    } catch (error) {
        console.error('Error in addToRecentlyPlayed:', error);
        next(error);
    }
};

exports.getRecentlyPlayed = async (req, res, next) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({ error: "Missing user_id" });
        }

        const { data, error } = await supabase
            .from('recently_played')
            .select('item_data')
            .eq('user_id', user_id)
            .order('played_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Return just the item_data array
        const tracks = data.map(item => item.item_data);

        res.status(200).json(tracks);
    } catch (error) {
        console.error('Error getting recently played:', error);
        next(error);
    }
};

exports.clearRecentlyPlayed = async (req, res, next) => {
    try {
        const { user_id } = req.body;
        if (!user_id) return res.status(400).json({ error: "Missing user_id" });

        const { error } = await supabase
            .from('recently_played')
            .delete()
            .eq('user_id', user_id);

        if (error) throw error;

        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};
