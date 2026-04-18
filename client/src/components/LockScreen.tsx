'use client';

import { useState } from 'react';
import { Lock, Loader2 } from 'lucide-react';

export default function LockScreen({
    mode,
    onSubmit,
    onCancel,
}: {
    mode: 'lock' | 'unlock';
    onSubmit: (passphrase: string) => Promise<boolean>;
    onCancel?: () => void;
}) {
    const [pass, setPass] = useState('');
    const [confirm, setConfirm] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (mode === 'lock') {
            if (pass.length < 8) return setError('Use at least 8 characters.');
            if (pass !== confirm) return setError('Passphrases do not match.');
        } else {
            if (!pass) return setError('Enter the passphrase.');
        }
        setError(null);
        setBusy(true);
        const ok = await onSubmit(pass);
        setBusy(false);
        if (!ok) setError(mode === 'unlock' ? 'Wrong passphrase.' : 'Could not encrypt.');
    };

    return (
        <div className="max-w-sm mx-auto w-full py-16">
            <div className="surface p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Lock size={16} style={{ color: 'var(--accent-strong)' }} />
                    <h2 className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                        {mode === 'unlock' ? 'Locked note' : 'Lock this note'}
                    </h2>
                </div>
                <p className="text-xs mb-5" style={{ color: 'var(--fg-muted)' }}>
                    {mode === 'unlock'
                        ? 'Enter the passphrase to decrypt and view this note. The passphrase never leaves your browser.'
                        : 'Choose a passphrase. The note is encrypted with AES-GCM in your browser; only the ciphertext is sent to the server. If you forget it, the contents are unrecoverable.'}
                </p>
                <form onSubmit={submit} className="space-y-3">
                    <input
                        type="password"
                        autoFocus
                        required
                        placeholder="Passphrase"
                        className="input"
                        value={pass}
                        onChange={(e) => setPass(e.target.value)}
                    />
                    {mode === 'lock' && (
                        <input
                            type="password"
                            required
                            placeholder="Confirm passphrase"
                            className="input"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                        />
                    )}
                    {error && (
                        <div className="text-xs" style={{ color: '#ef4444' }}>{error}</div>
                    )}
                    <div className="flex gap-2">
                        <button type="submit" className="btn btn-primary text-xs flex-1" disabled={busy}>
                            {busy ? <Loader2 size={13} className="animate-spin" /> : (mode === 'unlock' ? 'Unlock' : 'Lock note')}
                        </button>
                        {onCancel && (
                            <button type="button" className="btn btn-ghost text-xs" onClick={onCancel}>
                                Cancel
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
