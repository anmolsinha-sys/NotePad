const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const UPDATABLE_FIELDS = ['title', 'content', 'tags', 'is_pinned', 'is_public', 'type', 'language', 'images'];
const MAX_CONTENT_BYTES = 1_500_000;
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;
const MAX_VERSIONS_PER_NOTE = 50;

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

const maybeSnapshot = async (supabase, note, userId) => {
    try {
        const { data: latest } = await supabase
            .from('note_versions')
            .select('created_at')
            .eq('note_id', note.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const shouldSnapshot = !latest || (Date.now() - new Date(latest.created_at).getTime()) > SNAPSHOT_INTERVAL_MS;
        if (!shouldSnapshot) return;

        await supabase.from('note_versions').insert([{
            note_id: note.id,
            content: note.content || '',
            title: note.title || null,
            created_by: userId,
        }]);

        // Trim beyond MAX_VERSIONS_PER_NOTE
        const { data: extras } = await supabase
            .from('note_versions')
            .select('id')
            .eq('note_id', note.id)
            .order('created_at', { ascending: false })
            .range(MAX_VERSIONS_PER_NOTE, MAX_VERSIONS_PER_NOTE + 500);
        if (extras && extras.length > 0) {
            await supabase.from('note_versions').delete().in('id', extras.map((v) => v.id));
        }
    } catch (err) {
        console.error('[notes.snapshot]', err);
        // Snapshot failures must not block saves.
    }
};

exports.updateNote = async (req, res) => {
    try {
        const noteId = req.params.id;

        const { data: note, error: fetchError } = await req.supabase
            .from('notes')
            .select('id, owner_id, collaborators, content, title')
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

        // Only snapshot when content changes
        if (typeof updateData.content === 'string' && updateData.content !== note.content) {
            await maybeSnapshot(req.supabase, note, req.user.id);
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

exports.listVersions = async (req, res) => {
    try {
        const noteId = req.params.id;

        const { data: note } = await req.supabase
            .from('notes')
            .select('id, owner_id, collaborators')
            .eq('id', noteId)
            .single();

        if (!note) return res.status(404).json({ status: 'fail', message: 'Note not found.' });

        const isOwner = note.owner_id === req.user.id;
        const isCollaborator = Array.isArray(note.collaborators) && note.collaborators.includes(req.user.id);
        if (!isOwner && !isCollaborator) {
            return res.status(403).json({ status: 'fail', message: 'No access.' });
        }

        const { data: versions, error } = await req.supabase
            .from('note_versions')
            .select('id, content, title, created_at, created_by')
            .eq('note_id', noteId)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('[notes.listVersions]', error);
            return res.status(400).json({ status: 'fail', message: 'Could not load history.' });
        }

        res.status(200).json({ status: 'success', results: versions.length, data: { versions } });
    } catch (err) {
        console.error('[notes.listVersions]', err);
        res.status(500).json({ status: 'fail', message: 'Could not load history.' });
    }
};

exports.restoreVersion = async (req, res) => {
    try {
        const { id: noteId, versionId } = req.params;

        const { data: note } = await req.supabase
            .from('notes')
            .select('id, owner_id, collaborators, content, title')
            .eq('id', noteId)
            .single();

        if (!note) return res.status(404).json({ status: 'fail', message: 'Note not found.' });

        const isOwner = note.owner_id === req.user.id;
        const isCollaborator = Array.isArray(note.collaborators) && note.collaborators.includes(req.user.id);
        if (!isOwner && !isCollaborator) {
            return res.status(403).json({ status: 'fail', message: 'No access.' });
        }

        const { data: version } = await req.supabase
            .from('note_versions')
            .select('content, title')
            .eq('id', versionId)
            .eq('note_id', noteId)
            .single();

        if (!version) return res.status(404).json({ status: 'fail', message: 'Version not found.' });

        // Snapshot current state before restoring (so restore is reversible)
        await req.supabase.from('note_versions').insert([{
            note_id: noteId,
            content: note.content || '',
            title: note.title || null,
            created_by: req.user.id,
        }]);

        const { data: updated, error: updateError } = await req.supabase
            .from('notes')
            .update({ content: version.content, title: version.title || note.title })
            .eq('id', noteId)
            .select()
            .single();

        if (updateError) {
            console.error('[notes.restoreVersion]', updateError);
            return res.status(400).json({ status: 'fail', message: 'Could not restore version.' });
        }

        res.status(200).json({ status: 'success', data: { note: updated } });
    } catch (err) {
        console.error('[notes.restoreVersion]', err);
        res.status(500).json({ status: 'fail', message: 'Could not restore version.' });
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

exports.searchNotes = async (req, res) => {
    try {
        const q = (req.query.q || '').toString().trim();
        if (!q) return res.status(200).json({ status: 'success', results: 0, data: { notes: [] } });

        const { data: notes, error } = await req.supabase
            .from('notes')
            .select('id, title, content, tags, updated_at, is_pinned, is_public, owner_id, collaborators')
            .or(`owner_id.eq.${req.user.id},collaborators.cs.{${req.user.id}}`)
            .textSearch('search_tsv', q, { type: 'websearch', config: 'english' })
            .limit(20);

        if (error) {
            console.error('[notes.search]', error);
            return res.status(400).json({ status: 'fail', message: 'Search failed.' });
        }

        const needle = q.toLowerCase();
        const snippetFor = (html) => {
            const text = (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            const idx = text.toLowerCase().indexOf(needle);
            if (idx === -1) return text.slice(0, 140);
            const start = Math.max(0, idx - 40);
            const end = Math.min(text.length, idx + needle.length + 80);
            return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
        };

        const results = notes.map((n) => ({
            id: n.id,
            title: n.title,
            snippet: snippetFor(n.content),
            tags: n.tags,
            updated_at: n.updated_at,
            is_pinned: n.is_pinned,
        }));

        res.status(200).json({ status: 'success', results: results.length, data: { notes: results } });
    } catch (err) {
        console.error('[notes.search]', err);
        res.status(500).json({ status: 'fail', message: 'Search failed.' });
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
