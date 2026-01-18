const supabase = require('../config/supabaseClient');

exports.addFavorite = async (req, res, next) => {
    try {
        const { user_id, item_id, type, item_data } = req.body;

        if (!user_id || !item_id || !type) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const { data, error } = await supabase
            .from('favorites')
            .upsert({
                user_id,
                item_id,
                type,
                item_data: item_data || {}
            }, {
                onConflict: ['user_id', 'item_id']
            })
            .select();

        if (error) {
            console.error('Supabase error adding favorite:', error);
            throw error;
        }

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error('Error in addFavorite:', error);
        next(error);
    }
};

exports.removeFavorite = async (req, res, next) => {
    try {
        const { user_id, item_id } = req.body;

        if (!user_id || !item_id) {
            return res.status(400).json({ error: "Missing user_id or item_id" });
        }

        const { error } = await supabase
            .from('favorites')
            .delete()
            .eq('user_id', user_id)
            .eq('item_id', item_id);

        if (error) throw error;

        res.status(200).json({ success: true });
    } catch (error) {
        next(error);
    }
};

exports.getFavorites = async (req, res, next) => {
    try {
        const { user_id } = req.params;

        if (!user_id) {
            return res.status(400).json({ error: "Missing user_id" });
        }

        const { data, error } = await supabase
            .from('favorites')
            .select('*')
            .eq('user_id', user_id);

        if (error) throw error;

        const favorites = {
            songs: data.filter(i => i.type === 'song').map(i => i.item_data),
            albums: data.filter(i => i.type === 'album').map(i => i.item_data),
            playlists: data.filter(i => i.type === 'playlist').map(i => i.item_data)
        };

        res.status(200).json(favorites);
    } catch (error) {
        next(error);
    }
};
