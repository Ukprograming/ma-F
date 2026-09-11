const test = require('node:test');
const assert = require('node:assert/strict');
const { validate } = require('./analysis-store.js');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture() {
    return {format:'ma-f-analysis',version:1,video:{name:'test.mp4',size:123,duration:2,width:640,height:360},
        analysis:{tracks:{obj1:{origin:{xm:0,ym:0},points:[{t:0,xpx:10,ypx:20,xm:0,ym:0},{t:1,xpx:20,ypx:30,xm:1,ym:1}]},obj2:{origin:null,points:[]}},
            scalePxPerMeter:10,axis:{ox:320,oy:180,theta:0},axisActive:true,currentTrackId:'obj1',currentTime:1,
            settings:{fps:30,calibrationLength:1,springK:25,regressionHalfWindow:7,massTrack:'obj1',springTrack:'obj2',mode:'springnorm',autoStep:true,plotRange:false,series:[true,false,true,true]}}};
}
test('JSON round trip preserves both tracks, physics and graph settings', () => {
    const value=fixture(); assert.deepEqual(validate(JSON.parse(JSON.stringify(value))), value);
});
for (const [name, mutate] of [
    ['wrong format', p=>p.format='video-motion-track-analysis'],
    ['future version', p=>p.version=2],
    ['infinite coordinate', p=>p.analysis.tracks.obj1.points[0].xpx=Infinity],
    ['out of video time', p=>p.analysis.tracks.obj1.points[1].t=9],
    ['duplicate time', p=>p.analysis.tracks.obj1.points[1].t=0],
    ['missing track', p=>delete p.analysis.tracks.obj2],
    ['zero scale', p=>p.analysis.scalePxPerMeter=0],
    ['missing scale with points', p=>p.analysis.scalePxPerMeter=null],
    ['invalid regression', p=>p.analysis.settings.regressionHalfWindow=1.5],
    ['negative spring constant', p=>p.analysis.settings.springK=-1],
    ['invalid series', p=>p.analysis.settings.series[0]='true'],
    ['invalid FPS', p=>p.analysis.settings.fps=0]
]) test('rejects '+name+' without modifying input', () => {
    const value=fixture(); mutate(value); const before=structuredClone(value);
    assert.throws(()=>validate(value)); assert.deepEqual(value,before);
});
test('inline application JavaScript parses', () => {
    const html=fs.readFileSync('index.html','utf8');
    const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)];
    assert.equal(scripts.length,1); new vm.Script(scripts[0][1]);
});
