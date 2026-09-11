/* Versioned, video-independent analysis files. No external dependencies. */
(function (root) {
    'use strict';
    const modes = ['xt', 'yt', 'vxt', 'vyt', 'axt', 'ayt', 'springnorm'];
    function validate(value) {
        const fail = () => { throw new Error('解析ファイルの形式または値が不正です。'); };
        const num = (v, min = -1e12, max = 1e12) => {
            if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) fail();
            return v;
        };
        const bool = v => { if (typeof v !== 'boolean') fail(); return v; };
        const id = v => { if (!['obj1', 'obj2'].includes(v)) fail(); return v; };
        if (!value || value.format !== 'ma-f-analysis' || value.version !== 1) fail();
        const a = value.analysis, v = value.video;
        if (!a || !v || typeof v.name !== 'string' || v.name.length > 1000) fail();
        const tracks = {};
        for (const key of ['obj1', 'obj2']) {
            const track = a.tracks?.[key];
            if (!track || !Array.isArray(track.points) || track.points.length > 50000) fail();
            let previous = -1;
            const points = track.points.map(p => {
                if (!p) fail();
                const t = num(p.t, 0, v.duration + 0.1);
                if (t <= previous) fail();
                previous = t;
                return { t, xpx: num(p.xpx, 0, v.width), ypx: num(p.ypx, 0, v.height), xm: num(p.xm), ym: num(p.ym) };
            });
            const origin = track.origin === null ? null : { xm: num(track.origin?.xm), ym: num(track.origin?.ym) };
            if (points.length && !origin) fail();
            tracks[key] = { points, origin };
        }
        const s = a.settings;
        if (!s || !modes.includes(s.mode)) fail();
        const settings = {
            fps: num(s.fps, 1, 240), calibrationLength: num(s.calibrationLength, 0.000001),
            springK: num(s.springK, 0), regressionHalfWindow: num(s.regressionHalfWindow, 1, 20),
            massTrack: id(s.massTrack), springTrack: id(s.springTrack), mode: s.mode,
            autoStep: bool(s.autoStep), plotRange: bool(s.plotRange),
            series: ['force', 'pos', 'vel', 'acc'].map((_, i) => bool(s.series?.[i]))
        };
        if (!Number.isInteger(settings.regressionHalfWindow)) fail();
        const scale = a.scalePxPerMeter === null ? null : num(a.scalePxPerMeter, 0.000001);
        if (!scale && Object.values(tracks).some(t => t.points.length)) fail();
        return {
            format: 'ma-f-analysis', version: 1,
            video: { name: v.name, size: v.size === null ? null : num(v.size, 0), duration: num(v.duration, 0.000001), width: num(v.width, 1, 32768), height: num(v.height, 1, 32768) },
            analysis: { tracks, scalePxPerMeter: scale, axis: { ox: num(a.axis?.ox), oy: num(a.axis?.oy), theta: num(a.axis?.theta) },
                axisActive: bool(a.axisActive), currentTrackId: id(a.currentTrackId), currentTime: num(a.currentTime, 0, v.duration), settings }
        };
    }
    root.AnalysisStore = { validate };
    if (typeof module !== 'undefined') module.exports = root.AnalysisStore;
})(globalThis);

