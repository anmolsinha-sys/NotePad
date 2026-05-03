import { ImageResponse } from 'next/og';

export const size = { width: 512, height: 512 };
export const contentType = 'image/png';

// Polished PWA / installable-app icon.
// Layered "stacked notepad" composition — the back sheet hints at depth, the front
// sheet shows abstract text lines + an accent cursor caret. Designed to read clearly
// at 32px (favicon) and at 192/512px (PWA install).
export default function Icon() {
    return new ImageResponse(
        (
            <div
                style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background:
                        'linear-gradient(135deg, #34d399 0%, #10b981 45%, #047857 100%)',
                    position: 'relative',
                }}
            >
                {/* Soft inner highlight in the top-left for depth */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '70%',
                        height: '70%',
                        background:
                            'radial-gradient(ellipse at top left, rgba(255,255,255,0.32), transparent 55%)',
                    }}
                />

                {/* Back sheet — offset, slightly rotated, darker for depth */}
                <div
                    style={{
                        position: 'absolute',
                        width: 280,
                        height: 360,
                        background: '#06281d',
                        borderRadius: 38,
                        border: '5px solid #065f46',
                        transform: 'rotate(-9deg) translate(-26px, 10px)',
                    }}
                />

                {/* Front sheet — the visual hero */}
                <div
                    style={{
                        position: 'relative',
                        width: 280,
                        height: 360,
                        background: '#0a0a0a',
                        borderRadius: 38,
                        border: '5px solid #34d399',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                        padding: '54px 40px 0 40px',
                        transform: 'rotate(5deg)',
                    }}
                >
                    {/* Tiny "binding" tab at the top */}
                    <div
                        style={{
                            position: 'absolute',
                            top: 14,
                            left: '50%',
                            transform: 'translateX(-50%)',
                            width: 60,
                            height: 8,
                            background: '#34d399',
                            borderRadius: 4,
                        }}
                    />
                    {/* Three text-line glyphs of decreasing prominence */}
                    <div
                        style={{
                            width: 200,
                            height: 20,
                            background: '#34d399',
                            borderRadius: 5,
                            marginBottom: 24,
                            opacity: 0.95,
                        }}
                    />
                    <div
                        style={{
                            width: 160,
                            height: 20,
                            background: '#34d399',
                            borderRadius: 5,
                            marginBottom: 24,
                            opacity: 0.7,
                        }}
                    />
                    <div
                        style={{
                            width: 180,
                            height: 20,
                            background: '#34d399',
                            borderRadius: 5,
                            marginBottom: 24,
                            opacity: 0.55,
                        }}
                    />
                    {/* Caret line — "you are here" */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                        <div
                            style={{
                                width: 110,
                                height: 20,
                                background: '#34d399',
                                borderRadius: 5,
                                opacity: 0.4,
                            }}
                        />
                        <div
                            style={{
                                width: 8,
                                height: 28,
                                background: '#34d399',
                                marginLeft: 8,
                                borderRadius: 2,
                            }}
                        />
                    </div>
                </div>
            </div>
        ),
        { ...size }
    );
}
