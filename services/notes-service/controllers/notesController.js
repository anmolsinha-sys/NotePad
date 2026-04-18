const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UPDATABLE_FIELDS = ['title', 'content', 'tags', 'is_pinned', 'is_public', 'type', 'language', 'images'];
const MAX_CONTENT_BYTES = 1_500_000;

const pickUpdate = (body = {}) => {
    const out = {};
    for (const key of UPDATABLE_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(body, key)) out[key] = body[key];
    }
    return out;
};

const canRead = (note, user) => {
    if (note.is_public) return { ok: true, canEdit: Boolean(user && user.id === note.owner_id) };
    if (!user) return { ok: false };
    if (user.id === note.owner_id) return { ok: true, canEdit: true };
    if (Array.isArray(note.collaborators) && note.collaborators.includes(user.id)) {
        return { ok: true, canEdit: true };
    }
    return { ok: false };
};

exports.createNote = async (req, res) => {
    try {
        const payload = pickUpdate(req.body);
        const { data: newNote, error } = await req.supabase
            .from('notes')
            .insert([{ ...payload, owner_id: req.user.id }])
            .select()
            .single();

        if (error) {
            console.error('[notes.create]', error);
            return res.status(400).json({ status: 'fail', message: 'Could not create note.' });
        }

        res.status(201).json({ status: 'success', data: { note: newNote } });
    } catch (err) {
        console.error('[notes.create]', err);
        res.status(500).json({ status: 'fail', message: 'Could not create note.' });
    }
};

exports.getNotes = async (req, res) => {
    try {
        const { data: notes, error } = await req.supabase
            .from('notes')
            .select('*')
            .or(`owner_id.eq.${req.user.id},collaborators.cs.{${req.user.id}}`)
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('[notes.list]', error);
            return res.status(400).json({ status: 'fail', message: 'Could not load notes.' });
        }

        res.status(200).json({
            status: 'success',
            results: notes.length,
            data: { notes },
        });
    } catch (err) {
        console.error('[notes.list]', err);
        res.status(500).json({ status: 'fail', message: 'Could not load notes.' });
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
            return res.status(404).json({ status: 'fail', message: 'Note not found.' });
        }

        const access = canRead(note, req.user);
        if (!access.ok) {
            return res.status(req.user ? 403 : 401).json({
                status: 'fail',
                message: req.user ? 'You do not have access to this note.' : 'Sign in to view this note.',
            });
        }

        res.status(200).json({
            status: 'success',
            data: { note, canEdit: Boolean(access.canEdit) },
        });
    } catch (err) {
        console.error('[notes.get]', err);
        res.status(500).json({ status: 'fail', message: 'Could not load note.' });
    }
};

exports.updateNote = async (req, res) => {
    try {
        const noteId = req.params.id;

        const { data: note, error: fetchError } = await req.supabase
            .from('notes')
            .select('id, owner_id, collaborators')
            .eq('id', noteId)
            .single();

        if (fetchError || !note) {
            return res.status(404).json({ status: 'fail', message: 'Note not found.' });
        }

        const isOwner = note.owner_id === req.user.id;
        const isCollaborator = Array.isArray(note.collaborators) && note.collaborators.includes(req.user.id);
        if (!isOwner && !isCollaborator) {
            return res.status(403).json({ status: 'fail', message: 'You do not have permission to edit this note.' });
        }

        const updateData = pickUpdate(req.body);

        // Only the owner can change sharing/pin state.
        if (!isOwner) {
            delete updateData.is_public;
            delete updateData.is_pinned;
        }

        if (typeof updateData.content === 'string' && updateData.content.length > MAX_CONTENT_BYTES) {
            return res.status(413).json({ status: 'fail', message: 'Note is too large. Split it up.' });
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ status: 'fail', message: 'Nothing to update.' });
        }

        const { data: updatedNote, error: updateError } = await req.supabase
            .from('notes')
            .update(updateData)
            .eq('id', noteId)
            .select()
            .single();

        if (updateError) {
            console.error('[notes.update]', updateError);
            return res.status(400).json({ status: 'fail', message: 'Could not update note.' });
        }

        res.status(200).json({ status: 'success', data: { note: updatedNote } });
    } catch (err) {
        console.error('[notes.update]', err);
        res.status(500).json({ status: 'fail', message: 'Could not update note.' });
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
            return res.status(404).json({ status: 'fail', message: 'Note not found.' });
        }

        if (note.owner_id !== req.user.id) {
            return res.status(403).json({ status: 'fail', message: 'Only the owner can delete this note.' });
        }

        const { error: deleteError } = await req.supabase
            .from('notes')
            .delete()
            .eq('id', noteId);

        if (deleteError) {
            console.error('[notes.delete]', deleteError);
            return res.status(400).json({ status: 'fail', message: 'Could not delete note.' });
        }

        res.status(204).end();
    } catch (err) {
        console.error('[notes.delete]', err);
        res.status(500).json({ status: 'fail', message: 'Could not delete note.' });
    }
};

exports.inviteCollaborator = async (req, res) => {
    try {
        const noteId = req.params.id;
        const email = (req.body && req.body.email || '').trim().toLowerCase();

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ status: 'fail', message: 'Enter a valid email.' });
        }

        const { data: note, error: fetchError } = await req.supabase
            .from('notes')
            .select('owner_id, collaborators')
            .eq('id', noteId)
            .single();

        if (fetchError || !note) {
            return res.status(404).json({ status: 'fail', message: 'Note not found.' });
        }

        if (note.owner_id !== req.user.id) {
            return res.status(403).json({ status: 'fail', message: 'Only the owner can invite collaborators.' });
        }

        const { data: invitee } = await req.supabase
            .from('users')
            .select('id, email, username')
            .eq('email', email)
            .single();

        if (!invitee) {
            return res.status(404).json({ status: 'fail', message: 'No account found for that email.' });
        }

        if (invitee.id === note.owner_id) {
            return res.status(400).json({ status: 'fail', message: 'You already own this note.' });
        }

        const current = Array.isArray(note.collaborators) ? note.collaborators : [];
        if (current.includes(invitee.id)) {
            return res.status(200).json({ status: 'success', message: 'Already a collaborator.' });
        }

        const { error: updateError } = await req.supabase
            .from('notes')
            .update({ collaborators: [...current, invitee.id] })
            .eq('id', noteId);

        if (updateError) {
            console.error('[notes.invite]', updateError);
            return res.status(400).json({ status: 'fail', message: 'Could not add collaborator.' });
        }

        res.status(200).json({ status: 'success', data: { user: { id: invitee.id, email: invitee.email, username: invitee.username } } });
    } catch (err) {
        console.error('[notes.invite]', err);
        res.status(500).json({ status: 'fail', message: 'Could not send invite.' });
    }
};

exports.uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: 'fail', message: 'No image file provided.' });
        }

        res.status(200).json({
            status: 'success',
            data: {
                url: req.file.path,
                publicId: req.file.filename,
            },
        });
    } catch (err) {
        console.error('[notes.upload]', err);
        res.status(500).json({ status: 'fail', message: 'Upload failed.' });
    }
};
