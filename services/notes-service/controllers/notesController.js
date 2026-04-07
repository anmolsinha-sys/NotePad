const cloudinary = require('cloudinary').v2;

// Cloudinary Config
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

exports.createNote = async (req, res) => {
    try {
        const { data: newNote, error } = await req.supabase
            .from('notes')
            .insert([{
                ...req.body,
                owner_id: req.user.id,
            }])
            .select()
            .single();

        if (error) throw new Error(error.message);

        res.status(201).json({
            status: 'success',
            data: {
                note: newNote,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }
};

exports.getNotes = async (req, res) => {
    try {
        const { data: notes, error } = await req.supabase
            .from('notes')
            .select('*')
            .or(`owner_id.eq.${req.user.id},collaborators.cs.{${req.user.id}}`);

        if (error) throw new Error(error.message);

        res.status(200).json({
            status: 'success',
            results: notes.length,
            data: {
                notes,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }
};

exports.getNote = async (req, res) => {
    try {
        const { data: note, error } = await req.supabase
            .from('notes')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error || !note) {
            return res.status(404).json({
                status: 'fail',
                message: 'No note found with that ID',
            });
        }

        // Determine if current requester can edit
        // 1. If public and no user, can't edit
        // 2. If user is owner, can edit
        // 3. If user is in collaborators, can edit
        let canEdit = false;
        if (req.user) {
            const isOwner = note.owner_id === req.user.id;
            const isCollaborator = note.collaborators && note.collaborators.includes(req.user.id);
            if (isOwner || isCollaborator) {
                canEdit = true;
            }
        }

        res.status(200).json({
            status: 'success',
            data: {
                note,
                canEdit
            },
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }
};

exports.updateNote = async (req, res) => {
    try {
        const noteId = req.params.id;

        // Fetch current note to check permissions
        const { data: note, error: fetchError } = await req.supabase
            .from('notes')
            .select('*')
            .eq('id', noteId)
            .single();

        if (fetchError || !note) {
            return res.status(404).json({
                status: 'fail',
                message: 'No note found with that ID',
            });
        }

        // Check if user is owner or collaborator
        const isOwner = note.owner_id === req.user.id;
        const isCollaborator = note.collaborators && note.collaborators.includes(req.user.id);

        if (!isOwner && !isCollaborator) {
            return res.status(403).json({
                status: 'fail',
                message: 'You do not have permission to update this note',
            });
        }

        // Sanitize update data
        const updateData = { ...req.body };
        delete updateData.id;
        delete updateData.owner_id;

        const { data: updatedNote, error: updateError } = await req.supabase
            .from('notes')
            .update(updateData)
            .eq('id', noteId)
            .select()
            .single();

        if (updateError) throw new Error(updateError.message);

        res.status(200).json({
            status: 'success',
            data: {
                note: updatedNote,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }
};

exports.deleteNote = async (req, res) => {
    try {
        const noteId = req.params.id;

        const { data: note, error: fetchError } = await req.supabase
            .from('notes')
            .select('owner_id')
            .eq('id', noteId)
            .single();

        if (fetchError || !note) {
            return res.status(404).json({
                status: 'fail',
                message: 'No note found with that ID',
            });
        }

        if (note.owner_id !== req.user.id) {
            return res.status(403).json({
                status: 'fail',
                message: 'Only the owner can delete a note',
            });
        }

        const { error: deleteError } = await req.supabase
            .from('notes')
            .delete()
            .eq('id', noteId);

        if (deleteError) throw new Error(deleteError.message);

        res.status(204).json({
            status: 'success',
            data: null,
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }
};

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                status: 'fail',
                message: 'Please upload an image!',
            });
        }

        // File is already uploaded to Cloudinary via Multer-Storage-Cloudinary
        res.status(200).json({
            status: 'success',
            data: {
                url: req.file.path,
                public_id: req.file.filename,
            },
        });
    } catch (err) {
        res.status(400).json({
            status: 'fail',
            message: err.message,
        });
    }
};
