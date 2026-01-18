// const Playlist = require("../models/Playlist");
const supabase = require("../config/supabaseClient");

exports.createPlaylist = async (req, res) => {
    const { name, songs } = req.body;

    try {
        // Insert playlist
        const { data: newPlaylist, error } = await supabase
            .from('playlists')
            .insert([{
                user_id: req.user.userId, // This comes from the JWT payload
                name,
                songs: songs || [] // JSONB column
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);

        res.json({ message: "Playlist created successfully", playlist: newPlaylist });
    } catch (error) {
        console.error("Create Playlist Error:", error);
        res.status(500).json({ error: "Server error" });
    }
};

exports.getPlaylists = async (req, res) => {
    try {
        const { data: playlists, error } = await supabase
            .from('playlists')
            .select('*')
            .eq('user_id', req.user.userId);

        if (error) throw new Error(error.message);

        res.json(playlists);
    } catch (error) {
        console.error("Get Playlists Error:", error);
        res.status(500).json({ error: "Server error" });
    }
};
